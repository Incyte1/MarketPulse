from __future__ import annotations

from dataclasses import dataclass

import pandas as pd

from app.clients.stooq_client import fetch_daily_history
from app.utils.symbols import symbol_profile


@dataclass(frozen=True)
class MarketDataBundle:
    symbol: str
    company_name: str
    benchmark_symbol: str
    sector_etf: str
    analysis_mode: str
    price_history: pd.DataFrame
    benchmark_history: pd.DataFrame
    sector_history: pd.DataFrame


def _prepare_history(df: pd.DataFrame) -> pd.DataFrame:
    prepared = df.copy()
    prepared.columns = [str(column).strip().lower() for column in prepared.columns]

    required = ["datetime", "open", "high", "low", "close", "volume"]
    for column in required:
        if column not in prepared.columns:
            if column == "volume":
                prepared[column] = 0.0
            else:
                raise ValueError(f"Missing required market data column '{column}'")

    prepared["datetime"] = pd.to_datetime(prepared["datetime"], errors="coerce")
    prepared = prepared.dropna(subset=["datetime"]).copy()

    for column in ["open", "high", "low", "close", "volume"]:
        prepared[column] = pd.to_numeric(prepared[column], errors="coerce")

    prepared = prepared.dropna(subset=["open", "high", "low", "close"]).copy()
    prepared = prepared.sort_values("datetime").drop_duplicates(subset=["datetime"], keep="last")
    return prepared.reset_index(drop=True)


def load_market_data_bundle(symbol: str, outputsize: int = 260) -> MarketDataBundle:
    profile = symbol_profile(symbol)
    normalized = profile["symbol"]
    benchmark_symbol = profile["benchmark_symbol"]
    sector_etf = profile["sector_etf"]

    price_history = _prepare_history(fetch_daily_history(normalized, outputsize=outputsize))
    benchmark_history = _prepare_history(fetch_daily_history(benchmark_symbol, outputsize=outputsize))
    sector_history = (
        benchmark_history
        if sector_etf == benchmark_symbol
        else _prepare_history(fetch_daily_history(sector_etf, outputsize=outputsize))
    )

    return MarketDataBundle(
        symbol=normalized,
        company_name=profile["company"],
        benchmark_symbol=benchmark_symbol,
        sector_etf=sector_etf,
        analysis_mode="live",
        price_history=price_history,
        benchmark_history=benchmark_history,
        sector_history=sector_history,
    )
