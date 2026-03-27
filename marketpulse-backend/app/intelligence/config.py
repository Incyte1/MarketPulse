from __future__ import annotations

from dataclasses import dataclass, field


@dataclass(frozen=True)
class FeatureWindowConfig:
    short_return: int = 5
    medium_return: int = 20
    long_return: int = 60
    volume_window: int = 20
    atr_period: int = 14
    rsi_period: int = 14
    volatility_window: int = 20
    trend_window: int = 20
    drawdown_window: int = 63
    long_ma_window: int = 200
    lookback_bars: int = 260
    whipsaw_window: int = 10


@dataclass(frozen=True)
class CompositeWeightConfig:
    trend: float = 0.34
    momentum: float = 0.24
    volatility: float = 0.18
    relative_strength: float = 0.24


@dataclass(frozen=True)
class IntelligenceConfig:
    windows: FeatureWindowConfig = field(default_factory=FeatureWindowConfig)
    composite_weights: CompositeWeightConfig = field(default_factory=CompositeWeightConfig)
    source_interval: str = "1day"


DEFAULT_INTELLIGENCE_CONFIG = IntelligenceConfig()
