from __future__ import annotations

from app.intelligence.engines.base import (
    IntelligenceEngine,
    confidence_from_score,
    direction_from_score,
)
from app.intelligence.indicators import clamp
from app.models.intelligence import FactorScore, FeatureSnapshot


class TrendEngine(IntelligenceEngine):
    name = "trend"

    def evaluate(self, features: FeatureSnapshot) -> FactorScore:
        score = 50.0
        reasons: list[str] = []

        if features.ma_20 > features.ma_50 > features.ma_200:
            score += 14.0
            reasons.append("Moving averages are stacked constructively from fast to slow.")
        elif features.ma_20 < features.ma_50 < features.ma_200:
            score -= 14.0
            reasons.append("Moving averages are stacked bearishly from fast to slow.")

        if features.distance_from_ma_20_pct > 0:
            score += 7.0
            reasons.append("Price is holding above the 20-day trend reference.")
        else:
            score -= 7.0
            reasons.append("Price is trading below the 20-day trend reference.")

        if features.distance_from_ma_50_pct > 0:
            score += 7.0
            reasons.append("Price is holding above the 50-day trend reference.")
        else:
            score -= 7.0
            reasons.append("Price is trading below the 50-day trend reference.")

        if features.ma_20_slope_pct > 0:
            score += 6.0
        elif features.ma_20_slope_pct < 0:
            score -= 6.0

        if features.ma_50_slope_pct > 0:
            score += 6.0
        elif features.ma_50_slope_pct < 0:
            score -= 6.0

        if features.trend_persistence_20 >= 0.65:
            score += 8.0
            reasons.append("Trend persistence is strong across the last month of trading.")
        elif features.trend_persistence_20 <= 0.35:
            score -= 8.0
            reasons.append("Trend persistence has been weak and unstable.")

        if features.higher_highs_20 and features.higher_lows_20:
            score += 8.0
            reasons.append("The recent structure is still printing higher highs and higher lows.")
        elif not features.higher_highs_20 and not features.higher_lows_20:
            score -= 8.0
            reasons.append("Recent structure is failing to build higher highs or higher lows.")

        if features.distance_from_ma_20_pct >= 12.0:
            score -= 4.0
            reasons.append("The move is becoming extended from the fast trend line.")
        elif features.distance_from_ma_20_pct <= -8.0:
            score -= 4.0
            reasons.append("The ticker is stretched below trend and needs repair.")

        score = round(clamp(score, 0.0, 100.0), 1)
        direction = direction_from_score(score)

        if direction == "bullish":
            summary = "Trend structure is constructive and still being defended."
        elif direction == "bearish":
            summary = "Trend structure is weak and currently favors caution."
        else:
            summary = "Trend structure is mixed and lacks a clean directional edge."

        return FactorScore(
            score=score,
            direction=direction,
            confidence=confidence_from_score(score),
            summary=summary,
            reasons=reasons[:4],
            metrics={
                "ma_20": features.ma_20,
                "ma_50": features.ma_50,
                "ma_200": features.ma_200,
                "distance_from_ma_20_pct": features.distance_from_ma_20_pct,
                "distance_from_ma_50_pct": features.distance_from_ma_50_pct,
                "ma_20_slope_pct": features.ma_20_slope_pct,
                "ma_50_slope_pct": features.ma_50_slope_pct,
                "trend_persistence_20": features.trend_persistence_20,
                "higher_highs_20": features.higher_highs_20,
                "higher_lows_20": features.higher_lows_20,
            },
        )
