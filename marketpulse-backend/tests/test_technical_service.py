from __future__ import annotations

import unittest
from unittest.mock import patch

import pandas as pd

from app.services.technical_service import _rsi, _stoch_rsi, get_technical_context


class TechnicalServiceTests(unittest.TestCase):
    def test_stoch_rsi_handles_flat_prices(self) -> None:
        close = pd.Series([100.0] * 30)

        k, d = _stoch_rsi(close, period=5, smooth_k=2, smooth_d=2)

        self.assertEqual(k.dtype, "float64")
        self.assertEqual(d.dtype, "float64")
        self.assertEqual(float(k.iloc[-1]), 50.0)
        self.assertEqual(float(d.iloc[-1]), 50.0)

    def test_rsi_handles_one_way_uptrend(self) -> None:
        close = pd.Series([float(value) for value in range(1, 40)])

        rsi = _rsi(close, period=5)

        self.assertEqual(rsi.dtype, "float64")
        self.assertEqual(float(rsi.iloc[-1]), 100.0)

    def test_get_short_term_technical_context_handles_flat_intraday_history(self) -> None:
        df = pd.DataFrame(
            {
                "datetime": pd.date_range("2024-01-01 09:30:00", periods=30, freq="h"),
                "open": [100.0] * 30,
                "high": [101.0] * 30,
                "low": [99.0] * 30,
                "close": [100.0] * 30,
                "volume": [1000.0] * 30,
            }
        )

        with patch("app.services.technical_service.fetch_intraday_history", return_value=df):
            context = get_technical_context("SPY", interval="1day")

        self.assertEqual(context.stoch_rsi_k, 50.0)
        self.assertEqual(context.stoch_rsi_d, 50.0)
        self.assertEqual(context.momentum_state, "neutral")
        self.assertEqual(context.data_source_interval, "1h")
        self.assertEqual(context.data_range, "1D")
        self.assertEqual(context.calibration_window, "4D calibration built from 1-hour bars")
        self.assertEqual(context.range_position_percent, 50.0)

    def test_get_long_term_technical_context_handles_flat_daily_history(self) -> None:
        df = pd.DataFrame(
            {
                "datetime": pd.date_range("2024-01-01", periods=30, freq="D"),
                "open": [100.0] * 30,
                "high": [101.0] * 30,
                "low": [99.0] * 30,
                "close": [100.0] * 30,
                "volume": [1000.0] * 30,
            }
        )

        with patch("app.services.technical_service.fetch_daily_history", return_value=df):
            context = get_technical_context("SPY", interval="1week")

        self.assertEqual(context.stoch_rsi_k, 50.0)
        self.assertEqual(context.stoch_rsi_d, 50.0)
        self.assertEqual(context.momentum_state, "neutral")
        self.assertEqual(context.data_source_interval, "1day")
        self.assertEqual(context.data_range, "1W")
        self.assertEqual(context.calibration_window, "60D calibration built from 1-day bars")
        self.assertEqual(context.range_position_percent, 50.0)


if __name__ == "__main__":
    unittest.main()
