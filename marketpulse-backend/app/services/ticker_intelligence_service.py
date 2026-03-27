from __future__ import annotations

from app.intelligence.config import DEFAULT_INTELLIGENCE_CONFIG
from app.intelligence.market_data import load_market_data_bundle
from app.intelligence.mock_data import build_mock_market_data_bundle
from app.intelligence.pipeline import TickerIntelligencePipeline
from app.models.intelligence import TickerIntelligenceResponse


def get_ticker_intelligence(symbol: str) -> TickerIntelligenceResponse:
    normalized = symbol.upper().strip()
    pipeline = TickerIntelligencePipeline(config=DEFAULT_INTELLIGENCE_CONFIG)

    try:
        bundle = load_market_data_bundle(normalized, outputsize=DEFAULT_INTELLIGENCE_CONFIG.windows.lookback_bars)
    except Exception as exc:
        bundle = build_mock_market_data_bundle(normalized, outputsize=DEFAULT_INTELLIGENCE_CONFIG.windows.lookback_bars)
        result = pipeline.analyze(bundle)
        result.notes.append(f"Live market data fallback reason: {exc}")
        return result

    return pipeline.analyze(bundle)
