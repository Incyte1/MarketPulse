from __future__ import annotations

import pandas as pd

from app.clients.stooq_client import fetch_daily_history
from app.models.ticker import TechnicalContext


def _sma(series: pd.Series, window: int) -> pd.Series:
    return series.rolling(window=window, min_periods=window).mean()


def _rsi(close: pd.Series, period: int = 14) -> pd.Series:
    delta = close.diff()

    gain = delta.clip(lower=0)
    loss = -delta.clip(upper=0)

    avg_gain = gain.rolling(window=period, min_periods=period).mean()
    avg_loss = loss.rolling(window=period, min_periods=period).mean()

    rs = avg_gain / avg_loss.replace(0, pd.NA)
    rsi = 100 - (100 / (1 + rs))
    return rsi.fillna(50)


def get_technical_context(symbol: str) -> TechnicalContext:
    df = fetch_daily_history(symbol)

    if len(df) < 60:
        raise ValueError(f"Not enough history to compute technical context for {symbol}")

    close = pd.to_numeric(df["close"], errors="coerce")
    close = close.dropna()

    sma20 = _sma(close, 20)
    sma50 = _sma(close, 50)
    rsi14 = _rsi(close, 14)

    current_close = float(close.iloc[-1])
    current_sma20 = float(sma20.iloc[-1]) if pd.notna(sma20.iloc[-1]) else current_close
    current_sma50 = float(sma50.iloc[-1]) if pd.notna(sma50.iloc[-1]) else current_close
    current_rsi = float(rsi14.iloc[-1]) if pd.notna(rsi14.iloc[-1]) else 50.0

    if current_close > current_sma20:
        price_vs_20d = "above"
    elif current_close < current_sma20:
        price_vs_20d = "below"
    else:
        price_vs_20d = "at"

    if current_close > current_sma50:
        price_vs_50d = "above"
    elif current_close < current_sma50:
        price_vs_50d = "below"
    else:
        price_vs_50d = "at"

    if current_sma20 > current_sma50:
        trend_medium = "bullish"
    elif current_sma20 < current_sma50:
        trend_medium = "bearish"
    else:
        trend_medium = "neutral"

    # short trend from last several closes
    recent = close.tail(5)
    if len(recent) >= 2 and float(recent.iloc[-1]) > float(recent.iloc[0]):
        trend_short = "bullish"
    elif len(recent) >= 2 and float(recent.iloc[-1]) < float(recent.iloc[0]):
        trend_short = "bearish"
    else:
        trend_short = "neutral"

    if current_rsi >= 60:
        momentum_state = "positive"
    elif current_rsi <= 40:
        momentum_state = "negative"
    else:
        momentum_state = "neutral"

    distance_from_20d_percent = (
        ((current_close - current_sma20) / current_sma20) * 100.0 if current_sma20 else 0.0
    )
    distance_from_50d_percent = (
        ((current_close - current_sma50) / current_sma50) * 100.0 if current_sma50 else 0.0
    )

    structure_score = 0
    if trend_short == "bullish":
        structure_score += 1
    elif trend_short == "bearish":
        structure_score -= 1

    if trend_medium == "bullish":
        structure_score += 2
    elif trend_medium == "bearish":
        structure_score -= 2

    if price_vs_20d == "above":
        structure_score += 1
    elif price_vs_20d == "below":
        structure_score -= 1

    if price_vs_50d == "above":
        structure_score += 1
    elif price_vs_50d == "below":
        structure_score -= 1

    if momentum_state == "positive":
        structure_score += 1
    elif momentum_state == "negative":
        structure_score -= 1

    return TechnicalContext(
        trend_short=trend_short,
        trend_medium=trend_medium,
        price_vs_20d=price_vs_20d,
        price_vs_50d=price_vs_50d,
        distance_from_20d_percent=round(distance_from_20d_percent, 2),
        distance_from_50d_percent=round(distance_from_50d_percent, 2),
        momentum_state=momentum_state,
        structure_score=structure_score,
    )