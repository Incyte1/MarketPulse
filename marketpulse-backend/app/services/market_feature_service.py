from __future__ import annotations

from typing import Any

import pandas as pd

from app.clients.stooq_client import fetch_daily_history
from app.services.cache_db import cache_get, cache_set
from app.utils.symbols import symbol_profile

CACHE_MAX_AGE_SECONDS = 60 * 60


def _cache_key(symbol: str) -> str:
    return f"multivariate:{symbol.upper()}"


def _series(df: pd.DataFrame, column: str) -> pd.Series:
    return pd.to_numeric(df[column], errors="coerce").astype("float64")


def _pct_change(close: pd.Series, lookback: int) -> float:
    clean = _series(pd.DataFrame({"close": close}), "close").dropna()
    if len(clean) <= lookback:
        return 0.0

    start = float(clean.iloc[-(lookback + 1)])
    end = float(clean.iloc[-1])
    if start == 0.0:
        return 0.0
    return round(((end - start) / start) * 100.0, 2)


def _volume_ratio(df: pd.DataFrame, window: int = 20) -> float:
    volume = _series(df, "volume").fillna(0.0)
    if volume.empty:
        return 1.0
    baseline = float(volume.tail(window).mean()) if len(volume) >= window else float(volume.mean())
    latest = float(volume.iloc[-1])
    if baseline <= 0.0:
        return 1.0
    return round(latest / baseline, 2)


def _atr_percent(df: pd.DataFrame, period: int = 14) -> float:
    high = _series(df, "high")
    low = _series(df, "low")
    close = _series(df, "close")
    previous_close = close.shift(1)

    true_range = pd.concat(
        [
            (high - low).abs(),
            (high - previous_close).abs(),
            (low - previous_close).abs(),
        ],
        axis=1,
    ).max(axis=1)

    atr = true_range.rolling(window=period, min_periods=1).mean()
    latest_atr = float(atr.iloc[-1]) if len(atr) else 0.0
    latest_close = float(close.iloc[-1]) if len(close) else 0.0
    if latest_close <= 0.0:
        return 0.0
    return round((latest_atr / latest_close) * 100.0, 2)


def _market_tone(spy_return_20d: float, benchmark_return_20d: float) -> str:
    if spy_return_20d >= 3.0 and benchmark_return_20d >= 3.0:
        return "risk_on"
    if spy_return_20d <= -3.0 and benchmark_return_20d <= -3.0:
        return "risk_off"
    return "mixed"


def _plain_context_payload(
    *,
    symbol: str,
    company_name: str,
    sector: str,
    subsector: str,
    benchmark_symbol: str,
    sector_etf: str,
    return_5d: float,
    return_20d: float,
    return_50d: float,
    benchmark_return_20d: float,
    sector_return_20d: float,
    spy_return_20d: float,
    relative_strength_20d: float,
    relative_strength_sector_20d: float,
    volume_ratio_20d: float,
    atr_percent: float,
    market_tone: str,
) -> dict[str, Any]:
    return {
        "symbol": symbol,
        "company_name": company_name,
        "sector": sector,
        "subsector": subsector,
        "benchmark_symbol": benchmark_symbol,
        "sector_etf": sector_etf,
        "return_5d": return_5d,
        "return_20d": return_20d,
        "return_50d": return_50d,
        "benchmark_return_20d": benchmark_return_20d,
        "sector_return_20d": sector_return_20d,
        "spy_return_20d": spy_return_20d,
        "relative_strength_20d": relative_strength_20d,
        "relative_strength_sector_20d": relative_strength_sector_20d,
        "volume_ratio_20d": volume_ratio_20d,
        "atr_percent": atr_percent,
        "market_tone": market_tone,
    }


def get_multivariate_signal_context(symbol: str) -> dict[str, Any]:
    normalized = symbol.upper().strip()
    cached = cache_get(_cache_key(normalized), max_age_seconds=CACHE_MAX_AGE_SECONDS)
    if cached:
        return cached

    profile = symbol_profile(normalized)

    symbol_df = fetch_daily_history(normalized, outputsize=90)
    benchmark_df = fetch_daily_history(profile["benchmark_symbol"], outputsize=90)
    sector_df = (
        benchmark_df
        if profile["sector_etf"] == profile["benchmark_symbol"]
        else fetch_daily_history(profile["sector_etf"], outputsize=90)
    )
    spy_df = benchmark_df if profile["benchmark_symbol"] == "SPY" else fetch_daily_history("SPY", outputsize=90)

    symbol_close = _series(symbol_df, "close")
    benchmark_close = _series(benchmark_df, "close")
    sector_close = _series(sector_df, "close")
    spy_close = _series(spy_df, "close")

    return_5d = _pct_change(symbol_close, 5)
    return_20d = _pct_change(symbol_close, 20)
    return_50d = _pct_change(symbol_close, 50)
    benchmark_return_20d = _pct_change(benchmark_close, 20)
    sector_return_20d = _pct_change(sector_close, 20)
    spy_return_20d = _pct_change(spy_close, 20)

    payload = _plain_context_payload(
        symbol=normalized,
        company_name=profile["company"],
        sector=profile["sector"],
        subsector=profile["subsector"],
        benchmark_symbol=profile["benchmark_symbol"],
        sector_etf=profile["sector_etf"],
        return_5d=return_5d,
        return_20d=return_20d,
        return_50d=return_50d,
        benchmark_return_20d=benchmark_return_20d,
        sector_return_20d=sector_return_20d,
        spy_return_20d=spy_return_20d,
        relative_strength_20d=round(return_20d - benchmark_return_20d, 2),
        relative_strength_sector_20d=round(return_20d - sector_return_20d, 2),
        volume_ratio_20d=_volume_ratio(symbol_df, window=20),
        atr_percent=_atr_percent(symbol_df, period=14),
        market_tone=_market_tone(spy_return_20d, benchmark_return_20d),
    )
    cache_set(_cache_key(normalized), "multivariate", payload)
    return payload
