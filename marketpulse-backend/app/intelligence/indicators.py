from __future__ import annotations

import math

import numpy as np
import pandas as pd


def as_float_series(series: pd.Series) -> pd.Series:
    return pd.to_numeric(series, errors="coerce").astype("float64")


def clamp(value: float, lower: float, upper: float) -> float:
    return max(lower, min(upper, value))


def moving_average(series: pd.Series, window: int) -> pd.Series:
    return as_float_series(series).rolling(window=window, min_periods=1).mean()


def percent_change(series: pd.Series, lookback: int) -> float:
    clean = as_float_series(series).dropna()
    if len(clean) < 2:
        return 0.0

    index = max(0, len(clean) - lookback - 1)
    start = float(clean.iloc[index])
    end = float(clean.iloc[-1])
    if start == 0.0:
        return 0.0
    return ((end - start) / start) * 100.0


def percent_distance(current: float, reference: float) -> float:
    if reference == 0.0:
        return 0.0
    return ((current - reference) / reference) * 100.0


def slope_percent(series: pd.Series, lookback: int) -> float:
    clean = as_float_series(series).dropna()
    if len(clean) < 2:
        return 0.0

    index = max(0, len(clean) - lookback - 1)
    start = float(clean.iloc[index])
    end = float(clean.iloc[-1])
    if start == 0.0:
        return 0.0
    return ((end - start) / abs(start)) * 100.0


def rsi(series: pd.Series, period: int) -> pd.Series:
    close = as_float_series(series)
    delta = close.diff()
    gain = delta.clip(lower=0.0)
    loss = -delta.clip(upper=0.0)

    avg_gain = gain.rolling(window=period, min_periods=period).mean()
    avg_loss = loss.rolling(window=period, min_periods=period).mean()

    rs = avg_gain / avg_loss.mask(avg_loss == 0.0, np.nan)
    values = 100.0 - (100.0 / (1.0 + rs))

    only_gains = avg_gain.gt(0.0) & avg_loss.eq(0.0)
    only_losses = avg_gain.eq(0.0) & avg_loss.gt(0.0)
    no_move = avg_gain.eq(0.0) & avg_loss.eq(0.0)

    values = values.mask(only_gains, 100.0)
    values = values.mask(only_losses, 0.0)
    values = values.mask(no_move, 50.0)
    return values.fillna(50.0).astype("float64")


def atr(df: pd.DataFrame, period: int) -> pd.Series:
    high = as_float_series(df["high"])
    low = as_float_series(df["low"])
    close = as_float_series(df["close"])
    previous_close = close.shift(1)

    true_range = pd.concat(
        [
            (high - low).abs(),
            (high - previous_close).abs(),
            (low - previous_close).abs(),
        ],
        axis=1,
    ).max(axis=1)

    return true_range.rolling(window=period, min_periods=1).mean().astype("float64")


def realized_volatility(series: pd.Series, window: int) -> pd.Series:
    close = as_float_series(series)
    log_returns = np.log(close / close.shift(1)).replace([np.inf, -np.inf], np.nan)
    return (log_returns.rolling(window=window, min_periods=2).std() * math.sqrt(252) * 100.0).fillna(0.0)
