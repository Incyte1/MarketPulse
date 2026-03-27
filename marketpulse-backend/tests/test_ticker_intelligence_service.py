from __future__ import annotations

import unittest
from unittest.mock import patch

import numpy as np
import pandas as pd

from app.services.ticker_intelligence_service import get_ticker_intelligence


def _history(start: float, end: float, bars: int = 260, volume_bias: float = 1.0) -> pd.DataFrame:
    dates = pd.bdate_range("2024-01-01", periods=bars)
    close = np.linspace(start, end, bars)
    open_values = np.concatenate(([close[0] * 0.997], close[:-1]))
    high = np.maximum(open_values, close) * 1.01
    low = np.minimum(open_values, close) * 0.99
    volume = np.linspace(1_000_000 * volume_bias, 1_800_000 * volume_bias, bars)

    return pd.DataFrame(
        {
            "datetime": dates,
            "open": open_values,
            "high": high,
            "low": low,
            "close": close,
            "volume": volume,
        }
    )


class TickerIntelligenceServiceTests(unittest.TestCase):
    def test_get_ticker_intelligence_uses_live_market_history(self) -> None:
        symbol_history = _history(100.0, 168.0, volume_bias=1.3)
        benchmark_history = _history(100.0, 132.0, volume_bias=1.0)
        sector_history = _history(100.0, 142.0, volume_bias=1.1)

        def fake_fetch(symbol: str, outputsize: int = 260) -> pd.DataFrame:
            dataset = {
                "NVDA": symbol_history,
                "QQQ": benchmark_history,
                "XLK": sector_history,
            }
            return dataset[symbol.upper()].copy()

        with patch("app.intelligence.market_data.fetch_daily_history", side_effect=fake_fetch):
            result = get_ticker_intelligence("NVDA")

        self.assertEqual(result.analysis_mode, "live")
        self.assertEqual(result.ticker, "NVDA")
        self.assertEqual(result.bias, "bullish")
        self.assertGreater(result.factor_scores.trend.score, 60.0)
        self.assertGreater(result.factor_scores.relative_strength.score, 60.0)
        self.assertGreater(result.feature_snapshot.relative_strength_20d, 0.0)
        self.assertFalse(result.factor_scores.volume.available)

    def test_get_ticker_intelligence_falls_back_to_mock_history(self) -> None:
        with patch("app.intelligence.market_data.fetch_daily_history", side_effect=ValueError("network down")):
            result = get_ticker_intelligence("AAPL")

        self.assertEqual(result.analysis_mode, "mock")
        self.assertEqual(result.ticker, "AAPL")
        self.assertTrue(any("mock market data" in note.lower() for note in result.notes))
        self.assertGreaterEqual(result.composite_score, 0.0)
        self.assertLessEqual(result.composite_score, 100.0)


if __name__ == "__main__":
    unittest.main()
