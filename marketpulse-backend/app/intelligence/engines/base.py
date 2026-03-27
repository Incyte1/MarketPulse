from __future__ import annotations

from abc import ABC, abstractmethod

from app.intelligence.indicators import clamp
from app.models.intelligence import FactorScore, FeatureSnapshot


class IntelligenceEngine(ABC):
    name: str

    @abstractmethod
    def evaluate(self, features: FeatureSnapshot) -> FactorScore:
        raise NotImplementedError


def direction_from_score(score: float) -> str:
    if score >= 60.0:
        return "bullish"
    if score <= 40.0:
        return "bearish"
    return "neutral"


def confidence_from_score(score: float) -> float:
    return round(clamp(abs(score - 50.0) * 2.0, 5.0, 95.0), 1)


def unavailable_factor(summary: str) -> FactorScore:
    return FactorScore(
        score=50.0,
        status="pending",
        available=False,
        direction="neutral",
        confidence=5.0,
        summary=summary,
        reasons=["Reserved for a later milestone."],
        metrics={},
    )
