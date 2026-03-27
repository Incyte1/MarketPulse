from __future__ import annotations

from typing import Any

from pydantic import BaseModel, Field


class ChartLayoutPayload(BaseModel):
    symbol: str = "SPY"
    interval: str = "60"
    theme: str = "dark"
    indicators: list[str] = Field(default_factory=list)
    drawings: list[dict[str, Any]] = Field(default_factory=list)
    active_tool: str = "cursor"
    notes: str = ""
    tv_chart_content: dict[str, Any] = Field(default_factory=dict)


class ChartLayoutSummary(BaseModel):
    id: int
    name: str
    symbol: str
    interval: str
    theme: str
    is_default: bool = False
    updated_at: str


class ChartLayoutDocument(BaseModel):
    id: int
    name: str
    symbol: str
    interval: str
    theme: str
    is_default: bool = False
    created_at: str
    updated_at: str
    payload: ChartLayoutPayload


class ChartLayoutCreateRequest(BaseModel):
    name: str
    symbol: str = "SPY"
    interval: str = "60"
    theme: str = "dark"
    is_default: bool = False
    payload: ChartLayoutPayload = Field(default_factory=ChartLayoutPayload)


class ChartLayoutUpdateRequest(BaseModel):
    name: str | None = None
    symbol: str | None = None
    interval: str | None = None
    theme: str | None = None
    is_default: bool | None = None
    payload: ChartLayoutPayload | None = None


class ChartUserSettings(BaseModel):
    theme: str = "dark"
    favorite_intervals: list[str] = Field(default_factory=lambda: ["15", "60", "1D", "1W"])
    favorite_indicators: list[str] = Field(default_factory=lambda: ["VWAP", "EMA 20", "EMA 50", "Volume"])
    watchlist_symbols: list[str] = Field(default_factory=lambda: ["SPY", "QQQ", "NVDA", "MSFT"])
    last_symbol: str = "SPY"
    last_interval: str = "60"
    left_toolbar_open: bool = True
    right_sidebar_open: bool = True
    updated_at: str = ""


class ChartUserSettingsUpdateRequest(BaseModel):
    theme: str | None = None
    favorite_intervals: list[str] | None = None
    favorite_indicators: list[str] | None = None
    watchlist_symbols: list[str] | None = None
    last_symbol: str | None = None
    last_interval: str | None = None
    left_toolbar_open: bool | None = None
    right_sidebar_open: bool | None = None


class ChartingBootstrapResponse(BaseModel):
    layouts: list[ChartLayoutSummary] = Field(default_factory=list)
    settings: ChartUserSettings = Field(default_factory=ChartUserSettings)
