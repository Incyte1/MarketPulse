from __future__ import annotations

from app.intelligence.engines.base import (
    IntelligenceEngine,
    confidence_from_score,
    direction_from_score,
)
from app.intelligence.indicators import clamp
from app.models.intelligence import FactorScore, FeatureSnapshot


class VolatilityEngine(IntelligenceEngine):
    name = "volatility"

    def evaluate(self, features: FeatureSnapshot) -> FactorScore:
        score = 50.0
        reasons: list[str] = []

        if features.atr_14_pct <= 2.8:
            score += 8.0
            reasons.append("ATR is relatively contained for an orderly setup.")
        elif features.atr_14_pct >= 5.0:
            score -= 10.0
            reasons.append("ATR is elevated enough to make the setup harder to trust.")

        if features.realized_vol_20_pct <= 28.0:
            score += 8.0
            reasons.append("Realized volatility is calm enough for cleaner execution.")
        elif features.realized_vol_20_pct >= 45.0:
            score -= 10.0
            reasons.append("Realized volatility is elevated and increases execution risk.")

        if features.whipsaw_ratio_10 <= 0.35:
            score += 10.0
            reasons.append("Recent tape action is relatively orderly instead of whippy.")
        elif features.whipsaw_ratio_10 >= 0.65:
            score -= 12.0
            reasons.append("Recent price action has been whippy and unstable.")

        if features.gap_risk_20_pct <= 1.2:
            score += 6.0
            reasons.append("Gap behavior has been modest.")
        elif features.gap_risk_20_pct >= 3.0:
            score -= 9.0
            reasons.append("Gap behavior is meaningful enough to increase overnight risk.")

        if features.compression_ratio_20 <= 0.9:
            score += 8.0
            reasons.append("Volatility is compressing, which can support cleaner setups.")
        elif features.compression_ratio_20 >= 1.2:
            score -= 7.0
            reasons.append("Volatility is expanding faster than usual.")

        if features.drawdown_from_63d_high_pct <= 6.0:
            score += 4.0
        elif features.drawdown_from_63d_high_pct >= 15.0:
            score -= 6.0
            reasons.append("The ticker remains meaningfully below its recent high-water mark.")

        score = round(clamp(score, 0.0, 100.0), 1)
        direction = direction_from_score(score)

        if direction == "bullish":
            summary = "Volatility conditions are constructive rather than dangerous."
        elif direction == "bearish":
            summary = "Volatility conditions are unstable and increase risk."
        else:
            summary = "Volatility is mixed and only partially supportive."

        return FactorScore(
            score=score,
            direction=direction,
            confidence=confidence_from_score(score),
            summary=summary,
            reasons=reasons[:4],
            metrics={
                "atr_14": features.atr_14,
                "atr_14_pct": features.atr_14_pct,
                "realized_vol_20_pct": features.realized_vol_20_pct,
                "gap_risk_20_pct": features.gap_risk_20_pct,
                "whipsaw_ratio_10": features.whipsaw_ratio_10,
                "compression_ratio_20": features.compression_ratio_20,
                "drawdown_from_63d_high_pct": features.drawdown_from_63d_high_pct,
            },
        )
