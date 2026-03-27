from __future__ import annotations

from app.intelligence.engines.base import (
    IntelligenceEngine,
    confidence_from_score,
    direction_from_score,
)
from app.intelligence.indicators import clamp
from app.models.intelligence import FactorScore, FeatureSnapshot


class RelativeStrengthEngine(IntelligenceEngine):
    name = "relative_strength"

    def evaluate(self, features: FeatureSnapshot) -> FactorScore:
        score = 50.0
        reasons: list[str] = []

        if features.relative_strength_20d >= 3.0:
            score += 12.0
            reasons.append(f"The ticker is outperforming {features.benchmark_symbol} over 20 sessions.")
        elif features.relative_strength_20d <= -3.0:
            score -= 12.0
            reasons.append(f"The ticker is lagging {features.benchmark_symbol} over 20 sessions.")

        if features.relative_strength_60d >= 5.0:
            score += 10.0
            reasons.append("Longer-window relative strength is still supportive.")
        elif features.relative_strength_60d <= -5.0:
            score -= 10.0
            reasons.append("Longer-window relative strength remains weak.")

        if features.sector_relative_strength_20d >= 2.0:
            score += 8.0
            reasons.append(f"The ticker is acting like a sector leader versus {features.sector_etf}.")
        elif features.sector_relative_strength_20d <= -2.0:
            score -= 8.0
            reasons.append(f"The ticker is lagging its sector reference {features.sector_etf}.")

        if features.outperform_days_20_ratio >= 0.6:
            score += 10.0
            reasons.append("The stock has been winning on most days versus its benchmark.")
        elif features.outperform_days_20_ratio <= 0.4:
            score -= 10.0
            reasons.append("The stock has been losing too often versus its benchmark.")

        if features.distance_to_60d_high_pct <= 5.0:
            score += 6.0
            reasons.append("The ticker is still trading close to its 3-month high zone.")
        elif features.distance_to_60d_high_pct >= 15.0:
            score -= 6.0
            reasons.append("The ticker is still far below its 3-month high zone.")

        score = round(clamp(score, 0.0, 100.0), 1)
        direction = direction_from_score(score)

        if direction == "bullish":
            summary = "Relative strength is supportive and the ticker is acting like a leader."
        elif direction == "bearish":
            summary = "Relative strength is weak and the ticker is acting like a laggard."
        else:
            summary = "Relative strength is mixed and not yet decisive."

        return FactorScore(
            score=score,
            direction=direction,
            confidence=confidence_from_score(score),
            summary=summary,
            reasons=reasons[:4],
            metrics={
                "benchmark_symbol": features.benchmark_symbol,
                "sector_etf": features.sector_etf,
                "relative_strength_20d": features.relative_strength_20d,
                "relative_strength_60d": features.relative_strength_60d,
                "sector_relative_strength_20d": features.sector_relative_strength_20d,
                "outperform_days_20_ratio": features.outperform_days_20_ratio,
                "distance_to_60d_high_pct": features.distance_to_60d_high_pct,
            },
        )
