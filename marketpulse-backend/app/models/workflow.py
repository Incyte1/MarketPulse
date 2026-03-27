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
