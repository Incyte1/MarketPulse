from __future__ import annotations

from typing import List, Optional

from pydantic import BaseModel, Field


class InterpretedArticle(BaseModel):
    title: str
    source: Optional[str] = None
    published_at: Optional[str] = None
    url: Optional[str] = None

    article_type: str = "general"
    relevance: str = "medium"
    direction: str = "neutral"
    impact: str = "medium"
    explanation: str = ""

    mentioned_tickers: List[str] = Field(default_factory=list)

    importance: Optional[str] = "medium"
    time_horizon: Optional[str] = "short_term"
    market_scope: Optional[str] = "ticker"

    key_takeaway: Optional[str] = None
    trade_relevance: Optional[str] = None
    confirmation_to_watch: Optional[str] = None
    invalidation_to_watch: Optional[str] = None
    impact_area: List[str] = Field(default_factory=list)


class PriceContext(BaseModel):
    current_price: float = 0.0
    previous_close: float = 0.0
    daily_change: float = 0.0
    daily_change_percent: float = 0.0
    trend_5d: str = "unknown"


class TechnicalContext(BaseModel):
    trend_short: str = "unknown"
    trend_medium: str = "unknown"
    price_vs_20d: str = "unknown"
    price_vs_50d: str = "unknown"
    price_vs_200d: str = "unknown"
    distance_from_20d_percent: float = 0.0
    distance_from_50d_percent: float = 0.0
    distance_from_200d_percent: float = 0.0
    ema_20: float = 0.0
    ema_50: float = 0.0
    ema_200: float = 0.0
    macd: float = 0.0
    macd_signal: float = 0.0
    macd_histogram: float = 0.0
    stoch_rsi_k: float = 50.0
    stoch_rsi_d: float = 50.0
    support_level: float = 0.0
    resistance_level: float = 0.0
    economic_pressure: str = "neutral"
    momentum_state: str = "unknown"
    structure_score: int = 0


class BiasInfo(BaseModel):
    label: str = "NEUTRAL"
    confidence_label: str = "Low"
    confidence_value: int = 0
    internal_score: int = 0
    total_score: int = 0
    news_score: int = 0
    technical_score: int = 0
    confirmation_score: int = 0
    bullish_count: int = 0
    bearish_count: int = 0
    neutral_count: int = 0


class GuidanceInfo(BaseModel):
    headline: str = "No guidance available"
    summary: str = ""
    preferred_direction: str = "neutral"
    warnings: List[str] = Field(default_factory=list)


class ProfessionalAnalysis(BaseModel):
    regime: str = "unknown"
    primary_driver: str = "unknown"
    secondary_drivers: List[str] = Field(default_factory=list)
    confirmation: List[str] = Field(default_factory=list)
    invalidation: List[str] = Field(default_factory=list)
    tactical_stance: str = ""
    key_risks: List[str] = Field(default_factory=list)
    executive_summary: str = ""
    plain_english_summary: str = ""


class TickerAnalysisResponse(BaseModel):
    symbol: str
    company_name: str
    market_status: str

    price_context: PriceContext
    technical_context: TechnicalContext
    bias: BiasInfo
    guidance: GuidanceInfo
    professional_analysis: ProfessionalAnalysis

    interpreted_ticker_news: List[InterpretedArticle] = Field(default_factory=list)
    interpreted_macro_news: List[InterpretedArticle] = Field(default_factory=list)
