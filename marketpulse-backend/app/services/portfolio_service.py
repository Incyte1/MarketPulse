from __future__ import annotations

from datetime import datetime, timezone

from app.models.ticker import TickerAnalysisResponse
from app.models.workflow import PortfolioCandidate, WorkspacePortfolioResponse
from app.services.cache_db import cache_get
from app.services.refresh_service import refresh_symbol_cache
from app.services.refresh_tasks import run_once
from app.services.workflow_service import get_workspace_detail

FRESH_SUMMARY_MAX_AGE = 60 * 15
STALE_SUMMARY_MAX_AGE = 60 * 60 * 24


def _utc_now() -> str:
    return datetime.now(timezone.utc).isoformat()


def _interval_for_horizon(horizon: str) -> str:
    return "1day" if horizon == "short_term" else "1week"


def _summary_cache_key(symbol: str, interval: str) -> str:
    return f"summary:{symbol}:{interval}"


def _analysis_for_symbol(symbol: str, interval: str) -> TickerAnalysisResponse:
    cache_key = _summary_cache_key(symbol, interval)

    fresh = cache_get(cache_key, max_age_seconds=FRESH_SUMMARY_MAX_AGE)
    if fresh:
        return TickerAnalysisResponse(**fresh)

    stale = cache_get(cache_key, max_age_seconds=STALE_SUMMARY_MAX_AGE)
    if stale:
        run_once(f"portfolio-refresh:{symbol}:{interval}", refresh_symbol_cache, symbol, interval)
        return TickerAnalysisResponse(**stale)

    refresh_symbol_cache(symbol, interval=interval)
    hydrated = cache_get(cache_key, max_age_seconds=STALE_SUMMARY_MAX_AGE)
    if not hydrated:
        raise ValueError(f"Unable to hydrate summary for {symbol}.")

    return TickerAnalysisResponse(**hydrated)


def _normalize_driver(driver: str) -> str:
    return driver.replace("_", " ").strip() if driver else "unknown"


def _conviction_score(analysis: TickerAnalysisResponse) -> float:
    bias = analysis.bias
    technical = analysis.technical_context

    score = 0.0
    score += float(bias.total_score) * 1.7
    score += float(technical.structure_score) * 1.45
    score += float(technical.trend_score) * 0.9
    score += float(technical.momentum_score) * 0.7
    score += float(bias.confidence_value) / 12.0

    if bias.label == "BULLISH":
        score += 1.4
    elif bias.label == "BEARISH":
        score -= 1.4

    if technical.regime_state == "trend_up":
        score += 1.25
    elif technical.regime_state == "trend_down":
        score -= 1.25

    if technical.volatility_state == "expanded" and bias.label != "BEARISH":
        score -= 0.75

    if technical.exhaustion_score < 0:
        score -= 0.8
    elif technical.exhaustion_score > 0 and bias.label == "BULLISH":
        score += 0.4

    return round(score, 2)


def _disposition_for_analysis(analysis: TickerAnalysisResponse) -> str:
    bias = analysis.bias
    technical = analysis.technical_context
    direction = analysis.guidance.preferred_direction

    bullish_stack = (
        direction == "long"
        and bias.total_score >= 5
        and technical.structure_score >= 2
        and (technical.trend_score >= 0 or technical.momentum_state == "positive")
    )
    bearish_stack = direction == "short" and (
        bias.total_score <= -5 or technical.structure_score <= -4 or technical.trend_score <= -3
    )

    if bullish_stack or (
        bias.label == "BULLISH"
        and bias.confidence_value >= 50
        and technical.structure_score >= 4
    ):
        return "buy"

    if bearish_stack or (
        bias.label == "BEARISH"
        and (bias.confidence_value >= 45 or technical.structure_score <= -5)
    ):
        return "sell"

    return "hold"


def _dedupe_lines(items: list[str], limit: int) -> list[str]:
    seen: set[str] = set()
    ordered: list[str] = []
    for raw in items:
        line = raw.strip()
        if not line:
            continue
        key = line.lower()
        if key in seen:
            continue
        seen.add(key)
        ordered.append(line)
        if len(ordered) >= limit:
            break
    return ordered


def _reasons_for_candidate(analysis: TickerAnalysisResponse, disposition: str) -> list[str]:
    pro = analysis.professional_analysis

    if disposition == "buy":
        reasons = [analysis.guidance.headline, *pro.confirmation]
    elif disposition == "sell":
        reasons = [analysis.guidance.headline, *pro.invalidation]
    else:
        reasons = [analysis.guidance.headline, *pro.confirmation[:1], pro.tactical_stance]

    return _dedupe_lines(reasons, limit=3)


def _warnings_for_candidate(analysis: TickerAnalysisResponse) -> list[str]:
    technical = analysis.technical_context
    warnings = [
        *analysis.guidance.warnings,
        *analysis.professional_analysis.key_risks,
    ]

    if technical.volatility_state == "expanded":
        warnings.append("Volatility is already expanded, so timing still matters.")
    if technical.exhaustion_score < 0:
        warnings.append("Momentum is extended enough that pullback risk should be respected.")
    if technical.economic_pressure == "risk_off":
        warnings.append("The broader tape still reads risk-off.")

    return _dedupe_lines(warnings, limit=3)


def _candidate_from_analysis(analysis: TickerAnalysisResponse) -> PortfolioCandidate:
    disposition = _disposition_for_analysis(analysis)
    return PortfolioCandidate(
        symbol=analysis.symbol,
        company_name=analysis.company_name,
        disposition=disposition,
        conviction_score=_conviction_score(analysis),
        bias_label=analysis.bias.label,
        confidence_label=analysis.bias.confidence_label,
        confidence_value=analysis.bias.confidence_value,
        total_score=analysis.bias.total_score,
        structure_score=analysis.technical_context.structure_score,
        current_price=analysis.price_context.current_price,
        daily_change_percent=analysis.price_context.daily_change_percent,
        trend_medium=analysis.technical_context.trend_medium,
        momentum_state=analysis.technical_context.momentum_state,
        regime_state=analysis.technical_context.regime_state,
        support_level=analysis.technical_context.support_level,
        resistance_level=analysis.technical_context.resistance_level,
        primary_driver=_normalize_driver(analysis.professional_analysis.primary_driver),
        summary=analysis.professional_analysis.plain_english_summary
        or analysis.professional_analysis.executive_summary,
        reasons=_reasons_for_candidate(analysis, disposition),
        warnings=_warnings_for_candidate(analysis),
    )


def _universe_symbols(detail) -> list[str]:
    symbols: list[str] = []
    seen: set[str] = set()

    for symbol in [detail.workspace.selected_symbol, *[item.symbol for item in detail.watchlist]]:
        normalized = symbol.strip().upper()
        if not normalized or normalized in seen:
            continue
        seen.add(normalized)
        symbols.append(normalized)

    return symbols


def _capacity_limit(symbol_count: int, horizon: str) -> int:
    if symbol_count <= 0:
        return 0

    baseline = 5 if horizon == "short_term" else 6
    return min(symbol_count, baseline)


def _overview_text(
    workspace_name: str,
    buy_queue: list[PortfolioCandidate],
    hold_queue: list[PortfolioCandidate],
    sell_queue: list[PortfolioCandidate],
    capacity_limit: int,
) -> str:
    if buy_queue:
        leader = buy_queue[0]
        return (
            f"{workspace_name} has {len(buy_queue)} buy candidate"
            f"{'' if len(buy_queue) == 1 else 's'} with {leader.symbol} leading the queue. "
            f"Capacity is capped at {capacity_limit}, so anything beyond the top slots stays on the bench."
        )

    if sell_queue:
        leader = sell_queue[0]
        return (
            f"{workspace_name} has no clean long entries right now. "
            f"{leader.symbol} is the clearest exit candidate while {len(hold_queue)} symbol"
            f"{'' if len(hold_queue) == 1 else 's'} remain under review."
        )

    return (
        f"{workspace_name} is mostly in review mode right now. "
        f"{len(hold_queue)} symbol{'' if len(hold_queue) == 1 else 's'} are being monitored for a cleaner setup."
    )


def build_workspace_portfolio(user_id: int, workspace_id: int) -> WorkspacePortfolioResponse:
    detail = get_workspace_detail(user_id, workspace_id)
    interval = _interval_for_horizon(detail.workspace.selected_horizon)
    symbols = _universe_symbols(detail)

    buy_queue: list[PortfolioCandidate] = []
    hold_queue: list[PortfolioCandidate] = []
    sell_queue: list[PortfolioCandidate] = []
    errors: list[str] = []
    market_status = "UNKNOWN"

    for symbol in symbols:
        try:
            analysis = _analysis_for_symbol(symbol, interval)
            if market_status == "UNKNOWN":
                market_status = analysis.market_status

            candidate = _candidate_from_analysis(analysis)
            if candidate.disposition == "buy":
                buy_queue.append(candidate)
            elif candidate.disposition == "sell":
                sell_queue.append(candidate)
            else:
                hold_queue.append(candidate)
        except Exception as exc:
            errors.append(f"{symbol}: {exc}")

    buy_queue.sort(key=lambda item: item.conviction_score, reverse=True)
    hold_queue.sort(key=lambda item: item.conviction_score, reverse=True)
    sell_queue.sort(key=lambda item: item.conviction_score)

    capacity_limit = _capacity_limit(len(symbols), detail.workspace.selected_horizon)
    for index, item in enumerate(buy_queue, start=1):
        item.rank = index
        item.slot_status = "primary" if index <= capacity_limit else "bench"

    for item in hold_queue:
        item.slot_status = "review"

    for item in sell_queue:
        item.slot_status = "exit"

    return WorkspacePortfolioResponse(
        workspace_id=detail.workspace.id,
        workspace_name=detail.workspace.name,
        selected_horizon=detail.workspace.selected_horizon,
        interval=interval,
        generated_at=_utc_now(),
        market_status=market_status,
        coverage_count=len(symbols),
        resolved_count=len(buy_queue) + len(hold_queue) + len(sell_queue),
        capacity_limit=capacity_limit,
        overview=_overview_text(
            workspace_name=detail.workspace.name,
            buy_queue=buy_queue,
            hold_queue=hold_queue,
            sell_queue=sell_queue,
            capacity_limit=capacity_limit,
        ),
        buy_queue=buy_queue,
        hold_queue=hold_queue,
        sell_queue=sell_queue,
        errors=errors,
    )
