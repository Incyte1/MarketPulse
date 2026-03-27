from __future__ import annotations

import numpy as np
import pandas as pd

from app.intelligence.market_data import MarketDataBundle
from app.utils.symbols import symbol_profile


def _seed_for_symbol(symbol: str) -> int:
    return sum((index + 1) * ord(char) for index, char in enumerate(symbol.upper()))


def _synthetic_history(symbol: str, bars: int, drift: float, volatility: float, start_price: float) -> pd.DataFrame:
    seed = _seed_for_symbol(symbol)
    rng = np.random.default_rng(seed)
    dates = pd.bdate_range(end=pd.Timestamp.today().normalize(), periods=bars)

    shocks = rng.normal(loc=drift, scale=volatility, size=bars)
    close = [start_price]

    for shock in shocks[1:]:
        close.append(max(3.0, close[-1] * (1.0 + shock)))

    close_series = pd.Series(close, dtype="float64")
    open_series = close_series.shift(1).fillna(close_series.iloc[0] * (1 - drift / 2))
    high = np.maximum(open_series, close_series) * (1.0 + rng.uniform(0.001, 0.02, size=bars))
    low = np.minimum(open_series, close_series) * (1.0 - rng.uniform(0.001, 0.02, size=bars))
    volume = rng.integers(900_000, 7_500_000, size=bars).astype("float64")

    return pd.DataFrame(
        {
            "datetime": dates,
            "open": open_series.round(2),
            "high": pd.Series(high).round(2),
            "low": pd.Series(low).round(2),
            "close": close_series.round(2),
            "volume": volume,
        }
    )


def build_mock_market_data_bundle(symbol: str, outputsize: int = 260) -> MarketDataBundle:
    profile = symbol_profile(symbol)
    normalized = profile["symbol"]
    benchmark_symbol = profile["benchmark_symbol"]
    sector_etf = profile["sector_etf"]

    seed = _seed_for_symbol(normalized)
    trend_drift = 0.0003 + ((seed % 7) * 0.00018)
    symbol_history = _synthetic_history(
        normalized,
        bars=outputsize,
        drift=trend_drift,
        volatility=0.014 + ((seed % 5) * 0.0015),
        start_price=40.0 + (seed % 120),
    )
    benchmark_history = _synthetic_history(
        benchmark_symbol,
        bars=outputsize,
        drift=0.00028,
        volatility=0.009,
        start_price=180.0 + (_seed_for_symbol(benchmark_symbol) % 180),
    )
    sector_history = (
        benchmark_history
        if sector_etf == benchmark_symbol
        else _synthetic_history(
            sector_etf,
            bars=outputsize,
            drift=0.00033,
            volatility=0.011,
            start_price=70.0 + (_seed_for_symbol(sector_etf) % 130),
        )
    )

    return MarketDataBundle(
        symbol=normalized,
        company_name=profile["company"],
        benchmark_symbol=benchmark_symbol,
        sector_etf=sector_etf,
        analysis_mode="mock",
        price_history=symbol_history,
        benchmark_history=benchmark_history,
        sector_history=sector_history,
    )
