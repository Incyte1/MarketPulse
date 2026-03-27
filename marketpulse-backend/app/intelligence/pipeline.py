from __future__ import annotations

from app.intelligence.config import DEFAULT_INTELLIGENCE_CONFIG, IntelligenceConfig
from app.intelligence.engines.base import unavailable_factor
from app.intelligence.engines.momentum import MomentumEngine
from app.intelligence.engines.relative_strength import RelativeStrengthEngine
from app.intelligence.engines.trend import TrendEngine
from app.intelligence.engines.volatility import VolatilityEngine
from app.intelligence.features import build_feature_snapshot
from app.intelligence.indicators import clamp
from app.intelligence.market_data import MarketDataBundle
from app.models.intelligence import (
    ChartAnnotation,
    FactorScore,
    FactorScoreSet,
    FeatureSnapshot,
    TickerIntelligenceResponse,
)


class TickerIntelligencePipeline:
    def __init__(self, config: IntelligenceConfig = DEFAULT_INTELLIGENCE_CONFIG) -> None:
        self.config = config
        self.trend_engine = TrendEngine()
        self.momentum_engine = MomentumEngine()
        self.volatility_engine = VolatilityEngine()
        self.relative_strength_engine = RelativeStrengthEngine()

    def analyze(self, bundle: MarketDataBundle) -> TickerIntelligenceResponse:
        features = build_feature_snapshot(bundle, self.config)
        factor_scores = FactorScoreSet(
            trend=self.trend_engine.evaluate(features),
            momentum=self.momentum_engine.evaluate(features),
            volatility=self.volatility_engine.evaluate(features),
            relative_strength=self.relative_strength_engine.evaluate(features),
            volume=unavailable_factor("Volume and participation scoring will land in a later milestone."),
            structure=unavailable_factor("Support and resistance structure scoring will land in a later milestone."),
            catalyst=unavailable_factor("Catalyst scoring will connect to live event data in a later milestone."),
        )

        composite_score = self._composite_score(factor_scores)
        setup_quality = round(
            (
                factor_scores.trend.score
                + factor_scores.momentum.score
                + factor_scores.volatility.score
                + factor_scores.relative_strength.score
            )
            / 4.0,
            1,
        )
        risk_score = self._risk_score(features, factor_scores.volatility)
        bias = self._bias_from_score(composite_score)
        regime = self._regime(features, factor_scores)
        confidence = self._confidence(composite_score, factor_scores, bundle.analysis_mode)

        strengths = self._strengths(factor_scores)
        warnings = self._warnings(features, factor_scores, bundle.analysis_mode)

        return TickerIntelligenceResponse(
            ticker=bundle.symbol,
            company_name=bundle.company_name,
            analysis_mode=bundle.analysis_mode,
            source_interval=self.config.source_interval,
            as_of=features.as_of,
            benchmark_symbol=bundle.benchmark_symbol,
            sector_etf=bundle.sector_etf,
            composite_score=composite_score,
            bias=bias,
            confidence=confidence,
            setup_quality=setup_quality,
            risk_score=risk_score,
            risk_level=self._risk_level(risk_score),
            regime=regime,
            factor_scores=factor_scores,
            strengths=strengths,
            warnings=warnings,
            summary_short=self._summary_short(bundle.symbol, bias, setup_quality, factor_scores),
            summary_detailed=self._summary_detailed(bundle.symbol, features, factor_scores, risk_score),
            chart_annotations=self._chart_annotations(features),
            feature_snapshot=features,
            notes=self._notes(bundle.analysis_mode),
        )

    def _composite_score(self, factor_scores: FactorScoreSet) -> float:
        weights = self.config.composite_weights
        weighted_total = (
            factor_scores.trend.score * weights.trend
            + factor_scores.momentum.score * weights.momentum
            + factor_scores.volatility.score * weights.volatility
            + factor_scores.relative_strength.score * weights.relative_strength
        )
        return round(clamp(weighted_total, 0.0, 100.0), 1)

    def _risk_score(self, features: FeatureSnapshot, volatility_score: FactorScore) -> float:
        gap_component = clamp(features.gap_risk_20_pct * 18.0, 0.0, 100.0)
        whipsaw_component = clamp(features.whipsaw_ratio_10 * 100.0, 0.0, 100.0)
        drawdown_component = clamp(features.drawdown_from_63d_high_pct * 4.0, 0.0, 100.0)
        risk = (
            (100.0 - volatility_score.score) * 0.55
            + gap_component * 0.15
            + whipsaw_component * 0.15
            + drawdown_component * 0.15
        )
        return round(clamp(risk, 0.0, 100.0), 1)

    def _bias_from_score(self, composite_score: float) -> str:
        if composite_score >= 60.0:
            return "bullish"
        if composite_score <= 40.0:
            return "bearish"
        return "neutral"

    def _confidence(self, composite_score: float, factor_scores: FactorScoreSet, analysis_mode: str) -> float:
        directions = [
            factor_scores.trend.direction,
            factor_scores.momentum.direction,
            factor_scores.volatility.direction,
            factor_scores.relative_strength.direction,
        ]
        agreement = max(directions.count("bullish"), directions.count("bearish"), directions.count("neutral")) / 4.0
        base = abs(composite_score - 50.0) * 1.5 + agreement * 25.0
        if analysis_mode == "live":
            base += 8.0
        else:
            base -= 5.0
        return round(clamp(base, 12.0, 92.0), 1)

    def _regime(self, features: FeatureSnapshot, factor_scores: FactorScoreSet) -> str:
        if factor_scores.trend.score >= 60.0 and factor_scores.momentum.score >= 60.0:
            if factor_scores.volatility.score >= 50.0:
                return "trend_continuation"
            return "high_beta_uptrend"

        if factor_scores.trend.score <= 40.0 and factor_scores.momentum.score <= 40.0:
            return "downtrend_pressure"

        if features.compression_ratio_20 <= 0.9 and factor_scores.trend.score >= 50.0:
            return "compression_breakout_watch"

        if features.whipsaw_ratio_10 >= 0.6:
            return "volatile_chop"

        return "range_or_transition"

    def _strengths(self, factor_scores: FactorScoreSet) -> list[str]:
        items = [
            ("Trend", factor_scores.trend),
            ("Momentum", factor_scores.momentum),
            ("Relative strength", factor_scores.relative_strength),
            ("Volatility", factor_scores.volatility),
        ]
        positives = [f"{label}: {factor.summary}" for label, factor in items if factor.score >= 58.0]
        return positives[:3]

    def _warnings(
        self,
        features: FeatureSnapshot,
        factor_scores: FactorScoreSet,
        analysis_mode: str,
    ) -> list[str]:
        warnings: list[str] = []

        if factor_scores.volatility.score <= 42.0:
            warnings.append("Volatility is unstable enough to make execution quality a real concern.")
        if factor_scores.momentum.score <= 42.0:
            warnings.append("Momentum is deteriorating, so continuation risk is elevated.")
        if factor_scores.relative_strength.score <= 42.0:
            warnings.append(
                f"Relative strength is weak versus {features.benchmark_symbol}, which lowers ranking quality."
            )
        if features.gap_risk_20_pct >= 3.0:
            warnings.append("Gap risk is elevated, so overnight exposure deserves extra caution.")
        if analysis_mode == "mock":
            warnings.append("Live market data was unavailable, so this read is running on deterministic mock data.")

        return warnings[:4]

    def _summary_short(
        self,
        symbol: str,
        bias: str,
        setup_quality: float,
        factor_scores: FactorScoreSet,
    ) -> str:
        factors = [
            ("trend", factor_scores.trend.score),
            ("momentum", factor_scores.momentum.score),
            ("relative strength", factor_scores.relative_strength.score),
            ("volatility", factor_scores.volatility.score),
        ]
        strongest = max(factors, key=lambda item: item[1])[0]
        weakest = min(factors, key=lambda item: item[1])[0]

        if bias == "bullish":
            return (
                f"{symbol} currently reads bullish with a {setup_quality:.1f} setup-quality score, "
                f"supported most clearly by {strongest}."
            )

        if bias == "bearish":
            return (
                f"{symbol} currently reads bearish with a {setup_quality:.1f} setup-quality score, "
                f"with the biggest pressure coming from {weakest}."
            )

        return (
            f"{symbol} currently reads neutral with a {setup_quality:.1f} setup-quality score, "
            f"where {strongest} is helping but {weakest} is still holding the setup back."
        )

    def _summary_detailed(
        self,
        symbol: str,
        features: FeatureSnapshot,
        factor_scores: FactorScoreSet,
        risk_score: float,
    ) -> str:
        leader = max(
            [
                ("trend", factor_scores.trend),
                ("momentum", factor_scores.momentum),
                ("relative strength", factor_scores.relative_strength),
                ("volatility", factor_scores.volatility),
            ],
            key=lambda item: item[1].score,
        )
        laggard = min(
            [
                ("trend", factor_scores.trend),
                ("momentum", factor_scores.momentum),
                ("relative strength", factor_scores.relative_strength),
                ("volatility", factor_scores.volatility),
            ],
            key=lambda item: item[1].score,
        )

        return (
            f"{symbol} is trading at {features.current_price:.2f} with 20-day relative strength of "
            f"{features.relative_strength_20d:.2f}% versus {features.benchmark_symbol}. "
            f"The strongest current input is {leader[0]}, while the weakest input is {laggard[0]}. "
            f"Risk is currently framed as {self._risk_level(risk_score)} because ATR is {features.atr_14_pct:.2f}% "
            f"of price and gap risk is {features.gap_risk_20_pct:.2f}%."
        )

    def _chart_annotations(self, features: FeatureSnapshot) -> list[ChartAnnotation]:
        return [
            ChartAnnotation(
                kind="support",
                label="20D support",
                value=features.support_20d,
                tone="support",
                message="Recent downside structure to watch for a hold or failure.",
            ),
            ChartAnnotation(
                kind="resistance",
                label="20D resistance",
                value=features.resistance_20d,
                tone="resistance",
                message="Nearest breakout zone based on the last 20 sessions.",
            ),
            ChartAnnotation(
                kind="resistance",
                label="60D high",
                value=features.resistance_60d,
                tone="resistance",
                message="Higher timeframe breakout reference.",
            ),
            ChartAnnotation(
                kind="moving_average",
                label="20D MA",
                value=features.ma_20,
                tone="trend",
                message="Fast trend reference for pullback acceptance.",
            ),
            ChartAnnotation(
                kind="moving_average",
                label="50D MA",
                value=features.ma_50,
                tone="trend",
                message="Medium trend reference for structure quality.",
            ),
        ]

    def _risk_level(self, risk_score: float) -> str:
        if risk_score >= 67.0:
            return "high"
        if risk_score >= 40.0:
            return "medium"
        return "low"

    def _notes(self, analysis_mode: str) -> list[str]:
        notes = [
            "Milestone 1 uses engineered features plus transparent rules-based scoring.",
            "Volume, structure, and catalyst modules are scaffolded as neutral placeholders for later milestones.",
        ]
        if analysis_mode == "mock":
            notes.append("This response was generated from mock market data because live history could not be fetched.")
        return notes
