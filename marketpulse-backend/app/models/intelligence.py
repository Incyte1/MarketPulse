from __future__ import annotations

from typing import Any

from pydantic import BaseModel, Field


class FactorScore(BaseModel):
    score: float = Field(default=50.0, ge=0.0, le=100.0)
    status: str = "ready"
    available: bool = True
    direction: str = "neutral"
    confidence: float = Field(default=50.0, ge=0.0, le=100.0)
    summary: str = ""
    reasons: list[str] = Field(default_factory=list)
    metrics: dict[str, Any] = Field(default_factory=dict)


class FactorScoreSet(BaseModel):
    trend: FactorScore = Field(default_factory=FactorScore)
    momentum: FactorScore = Field(default_factory=FactorScore)
    volatility: FactorScore = Field(default_factory=FactorScore)
    relative_strength: FactorScore = Field(default_factory=FactorScore)
    volume: FactorScore = Field(default_factory=FactorScore)
    structure: FactorScore = Field(default_factory=FactorScore)
    catalyst: FactorScore = Field(default_factory=FactorScore)


class ChartAnnotation(BaseModel):
    kind: str
    label: str
    value: float
    tone: str = "neutral"
    message: str = ""


class FeatureSnapshot(BaseModel):
    as_of: str
    benchmark_symbol: str
    sector_etf: str
    current_price: float
    one_day_change_pct: float
    return_5d: float
    return_20d: float
    return_60d: float
    benchmark_return_20d: float
    benchmark_return_60d: float
    sector_return_20d: float
    relative_strength_20d: float
    relative_strength_60d: float
    sector_relative_strength_20d: float
    outperform_days_20_ratio: float
    volume_ratio_20: float
    ma_20: float
    ma_50: float
    ma_200: float
    distance_from_ma_20_pct: float
    distance_from_ma_50_pct: float
    distance_from_ma_200_pct: float
    ma_20_slope_pct: float
    ma_50_slope_pct: float
    ma_200_slope_pct: float
    trend_persistence_20: float
    higher_highs_20: bool
    higher_lows_20: bool
    rsi_14: float
    atr_14: float
    atr_14_pct: float
    realized_vol_20_pct: float
    gap_risk_20_pct: float
    whipsaw_ratio_10: float
    compression_ratio_20: float
    drawdown_from_63d_high_pct: float
    support_20d: float
    resistance_20d: float
    resistance_60d: float
    distance_to_20d_high_pct: float
    distance_to_20d_low_pct: float
    distance_to_60d_high_pct: float


class TickerIntelligenceResponse(BaseModel):
    ticker: str
    company_name: str
    analysis_mode: str
    source_interval: str
    as_of: str
    benchmark_symbol: str
    sector_etf: str
    composite_score: float = Field(ge=0.0, le=100.0)
    bias: str
    confidence: float = Field(ge=0.0, le=100.0)
    setup_quality: float = Field(ge=0.0, le=100.0)
    risk_score: float = Field(ge=0.0, le=100.0)
    risk_level: str
    regime: str
    factor_scores: FactorScoreSet
    strengths: list[str] = Field(default_factory=list)
    warnings: list[str] = Field(default_factory=list)
    summary_short: str = ""
    summary_detailed: str = ""
    chart_annotations: list[ChartAnnotation] = Field(default_factory=list)
    feature_snapshot: FeatureSnapshot
    notes: list[str] = Field(default_factory=list)
