from __future__ import annotations

from app.intelligence.engines.base import (
    IntelligenceEngine,
    confidence_from_score,
    direction_from_score,
)
from app.intelligence.indicators import clamp
from app.models.intelligence import FactorScore, FeatureSnapshot


class MomentumEngine(IntelligenceEngine):
    name = "momentum"

    def evaluate(self, features: FeatureSnapshot) -> FactorScore:
        score = 50.0
        reasons: list[str] = []
        acceleration = features.return_5d - (features.return_20d / 4.0)

        if features.return_5d > 0:
            score += 8.0
            reasons.append("Short-term returns are still positive.")
        elif features.return_5d < 0:
            score -= 8.0
            reasons.append("Short-term returns have rolled over.")

        if features.return_20d > 0:
            score += 6.0
            reasons.append("Intermediate momentum remains constructive.")
        elif features.return_20d < 0:
            score -= 6.0
            reasons.append("Intermediate momentum remains weak.")

        if acceleration >= 1.5:
            score += 8.0
            reasons.append("Momentum is accelerating instead of fading.")
        elif acceleration <= -1.5:
            score -= 8.0
            reasons.append("Momentum is decelerating and needs follow-through.")

        if 55.0 <= features.rsi_14 <= 70.0:
            score += 10.0
            reasons.append("RSI is in a constructive zone without obvious exhaustion.")
        elif 70.0 < features.rsi_14 <= 78.0:
            score += 4.0
            reasons.append("RSI is strong, but the setup is getting warmer.")
        elif features.rsi_14 > 78.0:
            score -= 5.0
            reasons.append("Momentum is hot enough to raise exhaustion risk.")
        elif features.rsi_14 < 40.0:
            score -= 10.0
            reasons.append("RSI remains in a weak zone.")

        if features.distance_to_20d_high_pct <= 3.0 and features.return_5d > 0:
            score += 8.0
            reasons.append("Price is pressing close to recent highs with follow-through.")
        elif features.distance_to_20d_high_pct >= 10.0 and features.return_20d < 0:
            score -= 6.0
            reasons.append("Price is still far from reclaiming the recent high zone.")

        if features.distance_from_ma_20_pct >= 12.0 and features.rsi_14 >= 74.0:
            score -= 4.0
            reasons.append("The move is extended enough to invite pullback risk.")

        score = round(clamp(score, 0.0, 100.0), 1)
        direction = direction_from_score(score)

        if direction == "bullish":
            summary = "Momentum is supportive and still showing continuation behavior."
        elif direction == "bearish":
            summary = "Momentum is fading and currently works against continuation."
        else:
            summary = "Momentum is mixed, with no strong acceleration edge."

        return FactorScore(
            score=score,
            direction=direction,
            confidence=confidence_from_score(score),
            summary=summary,
            reasons=reasons[:4],
            metrics={
                "return_5d": features.return_5d,
                "return_20d": features.return_20d,
                "return_60d": features.return_60d,
                "acceleration": round(acceleration, 2),
                "rsi_14": features.rsi_14,
                "distance_to_20d_high_pct": features.distance_to_20d_high_pct,
                "distance_from_ma_20_pct": features.distance_from_ma_20_pct,
            },
        )
