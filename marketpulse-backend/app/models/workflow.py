from __future__ import annotations

from typing import List

from pydantic import BaseModel, Field


class MemoSourceLink(BaseModel):
    label: str
    url: str
    kind: str = "article"


class InvestmentMemo(BaseModel):
    thesis: str = ""
    setup: str = ""
    risks: str = ""
    invalidation: str = ""
    execution_plan: str = ""
    source_links: List[MemoSourceLink] = Field(default_factory=list)
    updated_at: str = ""


class WorkspaceSummary(BaseModel):
    id: int
    name: str
    description: str = ""
    is_default: bool = False
    selected_symbol: str = "SPY"
    selected_horizon: str = "short_term"
    watchlist_count: int = 0
    alert_count: int = 0
    updated_at: str = ""


class WorkspaceCreateRequest(BaseModel):
    name: str
    description: str = ""
    selected_symbol: str = "SPY"
    selected_horizon: str = "short_term"


class WorkspaceUpdateRequest(BaseModel):
    name: str | None = None
    description: str | None = None
    selected_symbol: str | None = None
    selected_horizon: str | None = None


class WatchlistItem(BaseModel):
    id: int
    symbol: str
    notes: str = ""
    sort_order: int = 0
    created_at: str = ""


class WatchlistAddRequest(BaseModel):
    symbol: str
    notes: str = ""


class AlertItem(BaseModel):
    id: int
    symbol: str
    horizon: str
    rule_type: str
    level: float
    status: str = "active"
    note: str = ""
    created_at: str = ""


class AlertCreateRequest(BaseModel):
    symbol: str
    horizon: str
    rule_type: str
    level: float
    note: str = ""


class MemoUpsertRequest(BaseModel):
    thesis: str = ""
    setup: str = ""
    risks: str = ""
    invalidation: str = ""
    execution_plan: str = ""
    source_links: List[MemoSourceLink] = Field(default_factory=list)


class WorkspaceDetailResponse(BaseModel):
    workspace: WorkspaceSummary
    watchlist: List[WatchlistItem] = Field(default_factory=list)
    alerts: List[AlertItem] = Field(default_factory=list)
    memo: InvestmentMemo


class PortfolioCandidate(BaseModel):
    symbol: str
    company_name: str
    disposition: str
    slot_status: str = "review"
    rank: int | None = None
    target_weight_percent: float = 0.0
    conviction_score: float = 0.0
    bias_label: str = "NEUTRAL"
    confidence_label: str = "Low"
    confidence_value: int = 0
    total_score: int = 0
    structure_score: int = 0
    current_price: float = 0.0
    daily_change_percent: float = 0.0
    trend_medium: str = "unknown"
    momentum_state: str = "unknown"
    regime_state: str = "range"
    support_level: float = 0.0
    resistance_level: float = 0.0
    sector: str = "Broad Market"
    subsector: str = "General"
    benchmark_symbol: str = "SPY"
    sector_etf: str = "SPY"
    return_5d: float = 0.0
    return_20d: float = 0.0
    return_50d: float = 0.0
    benchmark_return_20d: float = 0.0
    sector_return_20d: float = 0.0
    relative_strength_20d: float = 0.0
    relative_strength_sector_20d: float = 0.0
    volume_ratio_20d: float = 1.0
    atr_percent: float = 0.0
    market_tone: str = "mixed"
    primary_driver: str = "unknown"
    summary: str = ""
    reasons: List[str] = Field(default_factory=list)
    warnings: List[str] = Field(default_factory=list)


class WorkspacePortfolioResponse(BaseModel):
    workspace_id: int
    workspace_name: str
    selected_horizon: str
    interval: str
    generated_at: str
    market_status: str = "UNKNOWN"
    coverage_count: int = 0
    resolved_count: int = 0
    capacity_limit: int = 0
    overview: str = ""
    buy_queue: List[PortfolioCandidate] = Field(default_factory=list)
    hold_queue: List[PortfolioCandidate] = Field(default_factory=list)
    sell_queue: List[PortfolioCandidate] = Field(default_factory=list)
    errors: List[str] = Field(default_factory=list)


class BenchmarkSnapshot(BaseModel):
    label: str
    symbol: str
    return_percent: float = 0.0
    comparison_delta_percent: float = 0.0


class RebalanceAction(BaseModel):
    symbol: str
    action: str
    target_weight_percent: float = 0.0
    current_weight_percent: float = 0.0
    delta_weight_percent: float = 0.0
    rationale: str = ""


class AlpacaStatusInfo(BaseModel):
    configured: bool = False
    mode: str = "paper"
    connected: bool = False
    account_status: str = "unconfigured"
    equity: float = 0.0
    buying_power: float = 0.0
    cash: float = 0.0
    positions_count: int = 0
    message: str = ""


class WorkspacePortfolioReportResponse(BaseModel):
    workspace_id: int
    workspace_name: str
    generated_at: str
    headline: str = ""
    summary: str = ""
    model_portfolio_return_20d: float = 0.0
    benchmark_comparison: List[BenchmarkSnapshot] = Field(default_factory=list)
    top_opportunities: List[PortfolioCandidate] = Field(default_factory=list)
    top_risks: List[str] = Field(default_factory=list)
    rebalance_notes: List[str] = Field(default_factory=list)
    email_subject: str = ""
    email_preview: str = ""


class WorkspaceExecutionPreviewResponse(BaseModel):
    workspace_id: int
    workspace_name: str
    generated_at: str
    alpaca_status: AlpacaStatusInfo = Field(default_factory=AlpacaStatusInfo)
    target_slots: int = 0
    target_universe: List[PortfolioCandidate] = Field(default_factory=list)
    proposed_actions: List[RebalanceAction] = Field(default_factory=list)
    warnings: List[str] = Field(default_factory=list)
