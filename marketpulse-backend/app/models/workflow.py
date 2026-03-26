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
