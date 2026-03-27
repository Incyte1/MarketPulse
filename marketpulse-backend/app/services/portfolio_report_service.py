from __future__ import annotations

from datetime import datetime, timezone

from app.clients.alpaca_client import alpaca_is_configured, fetch_alpaca_account, fetch_alpaca_positions
from app.core.config import settings
from app.models.workflow import (
    AlpacaStatusInfo,
    BenchmarkSnapshot,
    PortfolioCandidate,
    RebalanceAction,
    WorkspaceExecutionPreviewResponse,
    WorkspacePortfolioReportResponse,
)
from app.services.portfolio_service import build_workspace_portfolio


def _utc_now() -> str:
    return datetime.now(timezone.utc).isoformat()


def _primary_targets(portfolio) -> list[PortfolioCandidate]:
    return [item for item in portfolio.buy_queue if item.slot_status == "primary"]


def _weighted_model_return_20d(targets: list[PortfolioCandidate]) -> float:
    if not targets:
        return 0.0
    return round(sum(item.return_20d * (item.target_weight_percent / 100.0) for item in targets), 2)


def _benchmark_lines(targets: list[PortfolioCandidate], model_return_20d: float) -> list[BenchmarkSnapshot]:
    if not targets:
        return []

    benchmark_map: dict[str, list[PortfolioCandidate]] = {}
    for item in targets:
        benchmark_map.setdefault(item.benchmark_symbol, []).append(item)

    lines = [
        BenchmarkSnapshot(
            label="Model Portfolio",
            symbol="MODEL",
            return_percent=model_return_20d,
            comparison_delta_percent=0.0,
        )
    ]

    for benchmark_symbol, members in benchmark_map.items():
        avg_return = sum(member.benchmark_return_20d for member in members) / max(len(members), 1)
        lines.append(
            BenchmarkSnapshot(
                label=f"{benchmark_symbol} comparison",
                symbol=benchmark_symbol,
                return_percent=round(avg_return, 2),
                comparison_delta_percent=round(model_return_20d - avg_return, 2),
            )
        )

    return lines


def _top_risks(portfolio) -> list[str]:
    risks: list[str] = []
    for candidate in [*portfolio.sell_queue[:2], *portfolio.hold_queue[:2], *portfolio.buy_queue[:2]]:
        risks.extend(candidate.warnings)

    deduped: list[str] = []
    seen: set[str] = set()
    for risk in risks:
        key = risk.strip().lower()
        if not key or key in seen:
            continue
        seen.add(key)
        deduped.append(risk.strip())
        if len(deduped) >= 4:
            break
    return deduped


def _rebalance_notes(portfolio, targets: list[PortfolioCandidate]) -> list[str]:
    notes: list[str] = []
    if targets:
        lead = targets[0]
        notes.append(
            f"Lead with {lead.symbol} at {lead.target_weight_percent:.2f}% while it remains the highest-conviction slot."
        )
    if portfolio.hold_queue:
        notes.append(
            f"Keep {len(portfolio.hold_queue)} name{'s' if len(portfolio.hold_queue) != 1 else ''} in review rather than forcing allocation."
        )
    if portfolio.sell_queue:
        notes.append(
            f"Treat {portfolio.sell_queue[0].symbol} as the clearest defensive exit if the book needs capital."
        )
    if not notes:
        notes.append("No rebalance changes are pressing right now.")
    return notes[:3]


def build_workspace_portfolio_report(user_id: int, workspace_id: int) -> WorkspacePortfolioReportResponse:
    portfolio = build_workspace_portfolio(user_id, workspace_id)
    targets = _primary_targets(portfolio)
    model_return_20d = _weighted_model_return_20d(targets)
    benchmark_comparison = _benchmark_lines(targets, model_return_20d)
    top_risks = _top_risks(portfolio)
    rebalance_notes = _rebalance_notes(portfolio, targets)

    headline = (
        f"{portfolio.workspace_name} model portfolio shows {len(targets)} active slot"
        f"{'' if len(targets) == 1 else 's'} with {portfolio.market_status.lower()} market conditions."
    )
    summary = (
        portfolio.overview
        if portfolio.overview
        else "The model portfolio is updating with the latest ranked signals."
    )

    top_names = ", ".join(item.symbol for item in targets[:3]) or "No active leaders"
    email_subject = f"{portfolio.workspace_name} daily portfolio summary"
    email_preview = (
        f"{headline} Top ranked names: {top_names}. "
        f"Model 20-day return profile is {model_return_20d:.2f}% versus tracked benchmarks."
    )

    return WorkspacePortfolioReportResponse(
        workspace_id=portfolio.workspace_id,
        workspace_name=portfolio.workspace_name,
        generated_at=_utc_now(),
        headline=headline,
        summary=summary,
        model_portfolio_return_20d=model_return_20d,
        benchmark_comparison=benchmark_comparison,
        top_opportunities=targets[:5],
        top_risks=top_risks,
        rebalance_notes=rebalance_notes,
        email_subject=email_subject,
        email_preview=email_preview,
    )


def _alpaca_status() -> AlpacaStatusInfo:
    if not alpaca_is_configured():
        return AlpacaStatusInfo(
            configured=False,
            mode="paper",
            connected=False,
            account_status="unconfigured",
            message="Set Alpaca credentials in the backend environment to enable live account previews.",
        )

    try:
        account = fetch_alpaca_account()
        positions = fetch_alpaca_positions()
        return AlpacaStatusInfo(
            configured=True,
            mode=settings.alpaca_trading_mode,
            connected=True,
            account_status=str(account.get("status", "active")),
            equity=float(account.get("equity") or 0.0),
            buying_power=float(account.get("buying_power") or 0.0),
            cash=float(account.get("cash") or 0.0),
            positions_count=len(positions),
            message="Alpaca account status fetched successfully.",
        )
    except Exception as exc:
        return AlpacaStatusInfo(
            configured=True,
            mode="paper",
            connected=False,
            account_status="error",
            message=str(exc),
        )


def _current_position_weights(alpaca_status: AlpacaStatusInfo) -> dict[str, float]:
    if not alpaca_status.configured or not alpaca_status.connected or alpaca_status.equity <= 0.0:
        return {}

    try:
        positions = fetch_alpaca_positions()
    except Exception:
        return {}

    weights: dict[str, float] = {}
    for item in positions:
        symbol = str(item.get("symbol", "")).upper().strip()
        market_value = float(item.get("market_value") or 0.0)
        if not symbol or alpaca_status.equity <= 0:
            continue
        weights[symbol] = round((market_value / alpaca_status.equity) * 100.0, 2)
    return weights


def _execution_actions(portfolio, current_weights: dict[str, float]) -> list[RebalanceAction]:
    targets = _primary_targets(portfolio)
    target_weights = {item.symbol: item.target_weight_percent for item in targets}
    actions: list[RebalanceAction] = []

    for item in targets:
        current_weight = current_weights.get(item.symbol, 0.0)
        delta = round(item.target_weight_percent - current_weight, 2)
        if current_weight <= 0.0:
            action = "buy"
        elif delta >= 2.0:
            action = "add"
        elif delta <= -2.0:
            action = "trim"
        else:
            action = "hold"

        actions.append(
            RebalanceAction(
                symbol=item.symbol,
                action=action,
                target_weight_percent=item.target_weight_percent,
                current_weight_percent=current_weight,
                delta_weight_percent=delta,
                rationale=item.reasons[0] if item.reasons else item.summary,
            )
        )

    for symbol, current_weight in current_weights.items():
        if symbol in target_weights:
            continue
        actions.append(
            RebalanceAction(
                symbol=symbol,
                action="sell",
                target_weight_percent=0.0,
                current_weight_percent=current_weight,
                delta_weight_percent=round(-current_weight, 2),
                rationale="The symbol is not in the current model portfolio target set.",
            )
        )

    priority = {"sell": 0, "buy": 1, "add": 2, "trim": 3, "hold": 4}
    actions.sort(key=lambda item: (priority.get(item.action, 5), -abs(item.delta_weight_percent)))
    return actions


def build_workspace_execution_preview(user_id: int, workspace_id: int) -> WorkspaceExecutionPreviewResponse:
    portfolio = build_workspace_portfolio(user_id, workspace_id)
    alpaca_status = _alpaca_status()
    current_weights = _current_position_weights(alpaca_status) if alpaca_status.connected else {}
    targets = _primary_targets(portfolio)
    actions = _execution_actions(portfolio, current_weights)

    warnings = []
    if not alpaca_status.configured:
        warnings.append("Execution preview is using the model portfolio only because Alpaca is not configured.")
    elif not alpaca_status.connected:
        warnings.append("Alpaca credentials are present, but account status could not be verified.")

    if portfolio.sell_queue:
        warnings.append(
            f"{portfolio.sell_queue[0].symbol} is the clearest defensive cut if the current book needs to rotate."
        )
    if any(item.market_tone == "risk_off" for item in targets):
        warnings.append("Market tone is at least partially risk-off, so deploy new capital selectively.")

    return WorkspaceExecutionPreviewResponse(
        workspace_id=portfolio.workspace_id,
        workspace_name=portfolio.workspace_name,
        generated_at=_utc_now(),
        alpaca_status=alpaca_status,
        target_slots=portfolio.capacity_limit,
        target_universe=targets,
        proposed_actions=actions,
        warnings=warnings[:4],
    )
