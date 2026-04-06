from __future__ import annotations

from dataclasses import dataclass
from datetime import date, datetime, timedelta, timezone
from functools import lru_cache
import math

from app.config import settings
from app.models import (
    ContractSelectionRationale,
    ImpliedVolatilitySnapshot,
    OptionChainSnapshot,
    OptionContract,
    OptionContractSnapshot,
    OptionDataQuality,
    OptionExpiration,
    OptionGreeks,
    OptionLiquiditySnapshot,
    OptionOpenInterest,
    OptionSelectionPreferences,
    OptionSelectionScoreComponent,
    OptionSide,
    OptionStrike,
    OptionTradeBias,
    OptionTradeIdea,
    OptionTradeIdeaStatus,
    OptionsProviderStatus,
    TradingSignalRecord
)
from app.providers.options import (
    AlpacaOptionsProvider,
    DisconnectedOptionsProvider,
    OptionsProvider,
    OptionsProviderError
)


DEFAULT_MIN_DTE = 3
DEFAULT_TARGET_DTE = 7
DEFAULT_MAX_DTE = 21
DEFAULT_MIN_OPEN_INTEREST = 400
DEFAULT_MAX_SPREAD_BPS = 900
DEFAULT_TARGET_DELTA = 0.35

SCORING_WEIGHTS = {
    "direction": 0.18,
    "dte": 0.17,
    "liquidity": 0.18,
    "spread": 0.14,
    "delta": 0.18,
    "premium": 0.10,
    "defined_risk": 0.05
}


@dataclass(frozen=True)
class RankedOptionCandidate:
    snapshot: OptionContractSnapshot
    score: float
    components: list[OptionSelectionScoreComponent]
    warnings: list[str]


class OptionsDataGateway:
    def __init__(self, provider: OptionsProvider) -> None:
        self.provider = provider

    def get_provider_status(self) -> OptionsProviderStatus:
        return self.provider.get_status()

    def get_option_chain(self, underlying_symbol: str) -> OptionChainSnapshot:
        return self.provider.get_option_chain(underlying_symbol.upper().strip())

    def get_option_snapshot(self, contract_symbol: str) -> OptionContractSnapshot:
        return self.provider.get_option_snapshot(contract_symbol.upper().strip())

    def get_greeks(self, contract_symbol: str) -> OptionGreeks:
        return self.provider.get_greeks(contract_symbol.upper().strip())

    def get_expirations(self, underlying_symbol: str) -> list[OptionExpiration]:
        return self.provider.get_expirations(underlying_symbol.upper().strip())

    def get_strikes(
        self,
        underlying_symbol: str,
        expiration_date: date | None = None
    ) -> list[OptionStrike]:
        return self.provider.get_strikes(
            underlying_symbol.upper().strip(),
            expiration_date=expiration_date
        )

    def get_underlying_linked_contract_candidates(
        self,
        underlying_symbol: str,
        side: OptionSide,
        *,
        expiration_date: date | None = None
    ) -> list[OptionContractSnapshot]:
        return self.provider.get_underlying_linked_contract_candidates(
            underlying_symbol.upper().strip(),
            side,
            expiration_date=expiration_date
        )


def _now() -> datetime:
    return datetime.now(timezone.utc)


@lru_cache
def get_options_data_gateway() -> OptionsDataGateway:
    if settings.options_provider == "alpaca":
        provider: OptionsProvider = AlpacaOptionsProvider(
            api_key=settings.alpaca_options_api_key,
            secret_key=settings.alpaca_options_secret_key,
            base_url=settings.alpaca_options_base_url
        )
    else:
        provider = DisconnectedOptionsProvider()
    return OptionsDataGateway(provider)


def reset_options_data_gateway() -> None:
    get_options_data_gateway.cache_clear()


def _default_premium_budget(underlying_price: float, signal: TradingSignalRecord) -> float:
    budget = max(175.0, min(900.0, underlying_price * (0.85 if signal.is_actionable else 0.65)))
    return round(budget, 2)


def build_selection_preferences(
    signal: TradingSignalRecord,
    *,
    underlying_price: float
) -> OptionSelectionPreferences:
    target_dte = DEFAULT_TARGET_DTE if signal.is_actionable else 10
    max_dte = DEFAULT_MAX_DTE if signal.is_actionable else 28
    target_delta = DEFAULT_TARGET_DELTA if signal.action in {"BUY", "SELL"} else 0.30
    min_open_interest = DEFAULT_MIN_OPEN_INTEREST if signal.is_actionable else 250
    return OptionSelectionPreferences(
        min_days_to_expiration=DEFAULT_MIN_DTE,
        target_days_to_expiration=target_dte,
        max_days_to_expiration=max_dte,
        min_open_interest=min_open_interest,
        max_spread_bps=DEFAULT_MAX_SPREAD_BPS,
        target_delta=target_delta,
        premium_budget=_default_premium_budget(underlying_price, signal),
        defined_risk_preference=True
    )


def _derive_bias(signal: TradingSignalRecord) -> tuple[OptionTradeBias, OptionSide | None, OptionTradeIdeaStatus]:
    if signal.action == "BUY":
        return ("bullish", "call", "candidate_ready" if signal.is_actionable else "watch")
    if signal.action == "SELL":
        return ("bearish", "put", "candidate_ready" if signal.is_actionable else "watch")

    if signal.entry_state == "wait_for_confirmation":
        if signal.intraday_features.trend_alignment == "bullish":
            return ("bullish", "call", "watch")
        if signal.intraday_features.trend_alignment == "bearish":
            return ("bearish", "put", "watch")

    return ("neutral", None, "not_applicable")


def _candidate_expirations(preferences: OptionSelectionPreferences) -> list[int]:
    offsets = [
        preferences.target_days_to_expiration - 2,
        preferences.target_days_to_expiration,
        min(preferences.max_days_to_expiration, preferences.target_days_to_expiration + 7)
    ]
    unique_offsets = {
        min(preferences.max_days_to_expiration, max(preferences.min_days_to_expiration, offset))
        for offset in offsets
    }
    return sorted(unique_offsets)


def _next_friday(base_day: date) -> date:
    return base_day + timedelta(days=(4 - base_day.weekday()) % 7)


def _placeholder_delta(side: OptionSide, magnitude: float) -> float:
    return round(magnitude if side == "call" else -magnitude, 2)


def _placeholder_quality(state: str) -> OptionDataQuality:
    return "provider" if state == "connected" else "estimated"


def build_placeholder_option_candidates(
    *,
    underlying_symbol: str,
    underlying_price: float,
    side: OptionSide,
    preferences: OptionSelectionPreferences,
    provider_status: OptionsProviderStatus
) -> list[OptionContractSnapshot]:
    base_day = _now().date()
    strike_offsets = [0.99, 1.01, 1.03] if side == "call" else [1.01, 0.99, 0.97]
    delta_targets = [0.46, preferences.target_delta, 0.24]
    volume_base = 220 if provider_status.state != "connected" else 480
    open_interest_base = 800 if provider_status.state != "connected" else 1_500
    quality = _placeholder_quality(provider_status.state)
    snapshots: list[OptionContractSnapshot] = []

    for expiry_index, dte in enumerate(_candidate_expirations(preferences)):
        expiry_date = _next_friday(base_day + timedelta(days=dte))
        actual_dte = max(0, (expiry_date - base_day).days)
        time_factor = math.sqrt(max(actual_dte, 1) / 7)

        for strike_index, multiplier in enumerate(strike_offsets):
            strike_price = round(underlying_price * multiplier, 2)
            delta_magnitude = max(0.12, min(0.55, delta_targets[min(strike_index, len(delta_targets) - 1)]))
            premium_factor = 0.0075 if strike_index == 0 else 0.0055 if strike_index == 1 else 0.0042
            ask = round(max(0.3, underlying_price * premium_factor * time_factor), 2)
            spread_ratio = 0.028 + (strike_index * 0.016) + (expiry_index * 0.006)
            spread_width = round(max(0.04, ask * spread_ratio), 2)
            bid = round(max(0.01, ask - spread_width), 2)
            mark = round((bid + ask) / 2, 2)
            spread_bps = int(round((spread_width / mark) * 10_000)) if mark else None
            volume = volume_base + (expiry_index * 90) + max(0, (2 - strike_index) * 120)
            open_interest = open_interest_base + (expiry_index * 350) + max(0, (2 - strike_index) * 500)

            snapshots.append(
                OptionContractSnapshot(
                    contract=OptionContract(
                        contract_symbol=(
                            f"{underlying_symbol.upper()}"
                            f"{expiry_date.strftime('%y%m%d')}"
                            f"{'C' if side == 'call' else 'P'}"
                            f"{int(round(strike_price * 1000)):08d}"
                        ),
                        underlying_symbol=underlying_symbol.upper(),
                        side=side,
                        strike=OptionStrike(
                            price=strike_price,
                            distance_percent=round(((strike_price / underlying_price) - 1) * 100, 2)
                        ),
                        expiration=OptionExpiration(
                            date=expiry_date,
                            days_to_expiration=actual_dte
                        )
                    ),
                    as_of=_now(),
                    source="planning-scaffold",
                    quality=quality,
                    liquidity=OptionLiquiditySnapshot(
                        bid=bid,
                        ask=ask,
                        mark=mark,
                        last=mark,
                        spread_width=spread_width,
                        spread_bps=spread_bps,
                        volume=volume,
                        open_interest=OptionOpenInterest(
                            value=open_interest,
                            source="planning-scaffold",
                            quality=quality
                        )
                    ),
                    implied_volatility=ImpliedVolatilitySnapshot(
                        value=round(0.29 + (expiry_index * 0.025) + (strike_index * 0.015), 4),
                        rank_percentile=62 + (expiry_index * 5) - (strike_index * 4),
                        source="planning-scaffold",
                        quality=quality
                    ),
                    greeks=OptionGreeks(
                        delta=_placeholder_delta(side, delta_magnitude),
                        gamma=round(0.018 + max(0, (0.012 - (strike_index * 0.003))), 4),
                        theta=round(-(0.07 + (expiry_index * 0.015) + (strike_index * 0.01)), 4),
                        vega=round(0.11 + (expiry_index * 0.025), 4),
                        rho=round(0.02 if side == "call" else -0.02, 4)
                    )
                )
            )

    return snapshots


def _component(label: str, weight: float, score: float, detail: str) -> OptionSelectionScoreComponent:
    safe_score = round(max(0.0, min(100.0, score)), 2)
    return OptionSelectionScoreComponent(
        label=label,  # type: ignore[arg-type]
        weight=weight,
        score=safe_score,
        contribution=round(weight * safe_score, 2),
        detail=detail
    )


def _score_direction(candidate: OptionContractSnapshot, bias: OptionTradeBias) -> OptionSelectionScoreComponent:
    expected_side = "call" if bias == "bullish" else "put"
    score = 100.0 if candidate.contract.side == expected_side else 0.0
    return _component(
        "direction",
        SCORING_WEIGHTS["direction"],
        score,
        f"{candidate.contract.side.title()} contract aligns with the {bias} underlying bias."
        if score == 100
        else f"{candidate.contract.side.title()} contract does not match the {bias} underlying bias."
    )


def _score_dte(candidate: OptionContractSnapshot, preferences: OptionSelectionPreferences) -> OptionSelectionScoreComponent:
    dte = candidate.contract.expiration.days_to_expiration
    if dte < preferences.min_days_to_expiration or dte > preferences.max_days_to_expiration:
        score = 0.0
    else:
        score = max(0.0, 100.0 - (abs(dte - preferences.target_days_to_expiration) * 11.5))
    return _component(
        "dte",
        SCORING_WEIGHTS["dte"],
        score,
        f"{dte} DTE vs target {preferences.target_days_to_expiration} keeps the time window {'aligned' if score >= 70 else 'loose'}."
    )


def _score_liquidity(candidate: OptionContractSnapshot, preferences: OptionSelectionPreferences) -> OptionSelectionScoreComponent:
    open_interest = candidate.liquidity.open_interest.value
    volume = candidate.liquidity.volume
    oi_ratio = min(1.0, open_interest / max(preferences.min_open_interest, 1))
    volume_target = max(50, preferences.min_open_interest // 4)
    volume_ratio = min(1.0, volume / volume_target)
    score = min(100.0, (oi_ratio * 60) + (volume_ratio * 40))
    return _component(
        "liquidity",
        SCORING_WEIGHTS["liquidity"],
        score,
        f"Open interest {open_interest:,} and volume {volume:,} define the current liquidity profile."
    )


def _score_spread(candidate: OptionContractSnapshot, preferences: OptionSelectionPreferences) -> OptionSelectionScoreComponent:
    spread_bps = candidate.liquidity.spread_bps or 9_999
    ratio = spread_bps / preferences.max_spread_bps
    if ratio <= 1:
        score = max(60.0, 100.0 - (ratio * 18))
    else:
        score = max(0.0, 82.0 - ((ratio - 1) * 90))
    return _component(
        "spread",
        SCORING_WEIGHTS["spread"],
        score,
        f"Spread is {candidate.liquidity.spread_width or 0:.2f} wide ({spread_bps} bps) against a {preferences.max_spread_bps} bps cap."
    )


def _score_delta(candidate: OptionContractSnapshot, preferences: OptionSelectionPreferences) -> OptionSelectionScoreComponent:
    delta = abs(candidate.greeks.delta) if candidate.greeks is not None else 0.0
    distance = abs(delta - preferences.target_delta)
    score = max(0.0, 100.0 - (distance * 260))
    return _component(
        "delta",
        SCORING_WEIGHTS["delta"],
        score,
        f"Delta {delta:.2f} vs target {preferences.target_delta:.2f} keeps directional sensitivity {'close' if score >= 70 else 'off target'}."
    )


def _score_premium(candidate: OptionContractSnapshot, preferences: OptionSelectionPreferences) -> OptionSelectionScoreComponent:
    ask = candidate.liquidity.ask or candidate.liquidity.mark or 0.0
    contract_cost = ask * candidate.contract.multiplier
    ratio = contract_cost / preferences.premium_budget if preferences.premium_budget else 10.0
    if ratio <= 1:
        score = max(68.0, 100.0 - (ratio * 24))
    else:
        score = max(0.0, 70.0 - ((ratio - 1) * 140))
    return _component(
        "premium",
        SCORING_WEIGHTS["premium"],
        score,
        f"Estimated contract cost is ${contract_cost:,.0f} against a ${preferences.premium_budget:,.0f} premium budget."
    )


def _score_defined_risk(candidate: OptionContractSnapshot, preferences: OptionSelectionPreferences) -> OptionSelectionScoreComponent:
    ask = candidate.liquidity.ask or candidate.liquidity.mark or 0.0
    score = 100.0 if preferences.defined_risk_preference and ask > 0 else 80.0
    detail = (
        "Defined-risk preference is satisfied because the scaffold only considers long premium contracts."
        if preferences.defined_risk_preference
        else "Defined-risk preference is relaxed for this candidate set."
    )
    return _component(
        "defined_risk",
        SCORING_WEIGHTS["defined_risk"],
        score,
        detail
    )


def rank_contract_candidates(
    candidates: list[OptionContractSnapshot],
    preferences: OptionSelectionPreferences,
    bias: OptionTradeBias
) -> list[RankedOptionCandidate]:
    ranked: list[RankedOptionCandidate] = []

    for candidate in candidates:
        components = [
            _score_direction(candidate, bias),
            _score_dte(candidate, preferences),
            _score_liquidity(candidate, preferences),
            _score_spread(candidate, preferences),
            _score_delta(candidate, preferences),
            _score_premium(candidate, preferences),
            _score_defined_risk(candidate, preferences)
        ]
        warnings: list[str] = []
        spread_bps = candidate.liquidity.spread_bps
        if spread_bps is not None and spread_bps > preferences.max_spread_bps:
            warnings.append(
                f"Spread is wider than the current cap at {spread_bps} bps."
            )
        if candidate.liquidity.open_interest.value < preferences.min_open_interest:
            warnings.append(
                f"Open interest is only {candidate.liquidity.open_interest.value:,}, below the preferred {preferences.min_open_interest:,}."
            )
        ask = candidate.liquidity.ask or candidate.liquidity.mark or 0.0
        contract_cost = ask * candidate.contract.multiplier
        if contract_cost > preferences.premium_budget:
            warnings.append(
                f"Estimated premium of ${contract_cost:,.0f} is above the current budget."
            )

        ranked.append(
            RankedOptionCandidate(
                snapshot=candidate,
                score=round(sum(component.contribution for component in components), 2),
                components=components,
                warnings=warnings
            )
        )

    return sorted(
        ranked,
        key=lambda item: (
            -item.score,
            item.snapshot.liquidity.spread_bps or 9_999,
            -item.snapshot.liquidity.open_interest.value,
            item.snapshot.contract.expiration.days_to_expiration
        )
    )


def _not_applicable_idea(
    signal: TradingSignalRecord,
    *,
    underlying_price: float,
    preferences: OptionSelectionPreferences,
    provider_status: OptionsProviderStatus
) -> OptionTradeIdea:
    return OptionTradeIdea(
        generated_at=_now(),
        status="not_applicable",
        mode="planning",
        underlying_symbol=signal.symbol,
        underlying_price=underlying_price,
        underlying_action=signal.action,
        bias="neutral",
        candidate_count=0,
        selection_score=0,
        provider_status=provider_status,
        selection_preferences=preferences,
        selected_contract=None,
        selected_snapshot=None,
        rationale=ContractSelectionRationale(
            summary="No option candidate is being proposed for this signal state.",
            reasons=[
                "The current intraday signal is managing risk or standing aside rather than preparing a fresh options entry."
            ],
            warnings=[provider_status.message] if provider_status.state != "connected" else [],
            score_components=[]
        )
    )


def build_option_trade_idea(
    signal: TradingSignalRecord,
    *,
    underlying_price: float
) -> OptionTradeIdea:
    gateway = get_options_data_gateway()
    provider_status = gateway.get_provider_status()
    preferences = build_selection_preferences(signal, underlying_price=underlying_price)
    bias, side, idea_status = _derive_bias(signal)

    if side is None or bias == "neutral":
        return _not_applicable_idea(
            signal,
            underlying_price=underlying_price,
            preferences=preferences,
            provider_status=provider_status
        )

    mode = "live" if provider_status.state == "connected" else "planning"
    try:
        candidates = (
            gateway.get_underlying_linked_contract_candidates(signal.symbol, side)
            if provider_status.state == "connected"
            else build_placeholder_option_candidates(
                underlying_symbol=signal.symbol,
                underlying_price=underlying_price,
                side=side,
                preferences=preferences,
                provider_status=provider_status
            )
        )
    except OptionsProviderError:
        candidates = build_placeholder_option_candidates(
            underlying_symbol=signal.symbol,
            underlying_price=underlying_price,
            side=side,
            preferences=preferences,
            provider_status=provider_status
        )
        mode = "planning"

    ranked = rank_contract_candidates(candidates, preferences, bias)
    if not ranked:
        return _not_applicable_idea(
            signal,
            underlying_price=underlying_price,
            preferences=preferences,
            provider_status=provider_status
        )

    selected = ranked[0]
    sorted_components = sorted(selected.components, key=lambda item: item.contribution, reverse=True)
    reasons = [
        component.detail
        for component in sorted_components[:4]
        if component.score >= 55
    ]
    warnings = list(selected.warnings)
    if provider_status.state != "connected":
        warnings.insert(0, provider_status.message)

    summary = (
        f"Selected {selected.snapshot.contract.contract_symbol} as the cleanest {bias} {side} candidate "
        "under the current DTE, delta, liquidity, spread, and premium constraints."
    )
    if idea_status == "watch":
        summary = (
            f"Prepared {selected.snapshot.contract.contract_symbol} as a watch candidate while the underlying setup is still waiting for confirmation."
        )

    return OptionTradeIdea(
        generated_at=_now(),
        status=idea_status,
        mode=mode,  # type: ignore[arg-type]
        underlying_symbol=signal.symbol,
        underlying_price=underlying_price,
        underlying_action=signal.action,
        bias=bias,
        candidate_count=len(ranked),
        selection_score=selected.score,
        provider_status=provider_status,
        selection_preferences=preferences,
        selected_contract=selected.snapshot.contract,
        selected_snapshot=selected.snapshot,
        rationale=ContractSelectionRationale(
            summary=summary,
            reasons=reasons,
            warnings=warnings,
            score_components=selected.components
        )
    )
