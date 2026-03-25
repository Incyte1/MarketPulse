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


def _ema(series: pd.Series, window: int) -> pd.Series:
    return series.ewm(span=window, adjust=False).mean()


def _macd(close: pd.Series) -> tuple[pd.Series, pd.Series, pd.Series]:
    ema12 = _ema(close, 12)
    ema26 = _ema(close, 26)
    macd_line = ema12 - ema26
    signal = _ema(macd_line, 9)
    histogram = macd_line - signal
    return macd_line, signal, histogram


def _stoch_rsi(close: pd.Series, period: int = 14, smooth_k: int = 3, smooth_d: int = 3) -> tuple[pd.Series, pd.Series]:
    rsi = _rsi(close, period=period)
    min_rsi = rsi.rolling(window=period, min_periods=period).min()
    max_rsi = rsi.rolling(window=period, min_periods=period).max()
    stoch = (rsi - min_rsi) / (max_rsi - min_rsi).replace(0, pd.NA) * 100
    k = stoch.rolling(window=smooth_k, min_periods=1).mean().fillna(50)
    d = k.rolling(window=smooth_d, min_periods=1).mean().fillna(50)
    return k, d


def get_technical_context(symbol: str) -> TechnicalContext:
    df = fetch_daily_history(symbol)

    if len(df) < 220:
        raise ValueError(f"Not enough history to compute technical context for {symbol}")

    close = pd.to_numeric(df["close"], errors="coerce")
    close = close.dropna()

    sma20 = _sma(close, 20)
    sma50 = _sma(close, 50)
    ema20 = _ema(close, 20)
    ema50 = _ema(close, 50)
    ema200 = _ema(close, 200)
    rsi14 = _rsi(close, 14)
    macd_line, macd_signal, macd_hist = _macd(close)
    stoch_k, stoch_d = _stoch_rsi(close)

    current_close = float(close.iloc[-1])
    current_sma20 = float(sma20.iloc[-1]) if pd.notna(sma20.iloc[-1]) else current_close
    current_sma50 = float(sma50.iloc[-1]) if pd.notna(sma50.iloc[-1]) else current_close
    current_ema20 = float(ema20.iloc[-1]) if pd.notna(ema20.iloc[-1]) else current_close
    current_ema50 = float(ema50.iloc[-1]) if pd.notna(ema50.iloc[-1]) else current_close
    current_ema200 = float(ema200.iloc[-1]) if pd.notna(ema200.iloc[-1]) else current_close
    current_rsi = float(rsi14.iloc[-1]) if pd.notna(rsi14.iloc[-1]) else 50.0
    current_macd = float(macd_line.iloc[-1]) if pd.notna(macd_line.iloc[-1]) else 0.0
    current_macd_signal = float(macd_signal.iloc[-1]) if pd.notna(macd_signal.iloc[-1]) else 0.0
    current_macd_hist = float(macd_hist.iloc[-1]) if pd.notna(macd_hist.iloc[-1]) else 0.0
    current_stoch_k = float(stoch_k.iloc[-1]) if pd.notna(stoch_k.iloc[-1]) else 50.0
    current_stoch_d = float(stoch_d.iloc[-1]) if pd.notna(stoch_d.iloc[-1]) else 50.0

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

    if current_close > current_ema200:
        price_vs_200d = "above"
    elif current_close < current_ema200:
        price_vs_200d = "below"
    else:
        price_vs_200d = "at"

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
    distance_from_200d_percent = (
        ((current_close - current_ema200) / current_ema200) * 100.0 if current_ema200 else 0.0
    )

    support_window = pd.to_numeric(df["low"], errors="coerce").dropna().tail(20)
    resistance_window = pd.to_numeric(df["high"], errors="coerce").dropna().tail(20)
    support_level = float(support_window.min()) if not support_window.empty else current_close
    resistance_level = float(resistance_window.max()) if not resistance_window.empty else current_close

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

    if price_vs_200d == "above":
        structure_score += 2
    elif price_vs_200d == "below":
        structure_score -= 2

    if momentum_state == "positive":
        structure_score += 1
    elif momentum_state == "negative":
        structure_score -= 1

    if current_macd > current_macd_signal:
        structure_score += 1
    elif current_macd < current_macd_signal:
        structure_score -= 1

    if current_stoch_k >= 80 and current_stoch_d >= 80:
        structure_score -= 1
    elif current_stoch_k <= 20 and current_stoch_d <= 20:
        structure_score += 1

    economic_pressure = "neutral"
    if price_vs_200d == "below" and current_macd_hist < 0:
        economic_pressure = "risk_off"
    elif price_vs_200d == "above" and current_macd_hist > 0:
        economic_pressure = "risk_on"

    return TechnicalContext(
        trend_short=trend_short,
        trend_medium=trend_medium,
        price_vs_20d=price_vs_20d,
        price_vs_50d=price_vs_50d,
        price_vs_200d=price_vs_200d,
        distance_from_20d_percent=round(distance_from_20d_percent, 2),
        distance_from_50d_percent=round(distance_from_50d_percent, 2),
        distance_from_200d_percent=round(distance_from_200d_percent, 2),
        ema_20=round(current_ema20, 2),
        ema_50=round(current_ema50, 2),
        ema_200=round(current_ema200, 2),
        macd=round(current_macd, 4),
        macd_signal=round(current_macd_signal, 4),
        macd_histogram=round(current_macd_hist, 4),
        stoch_rsi_k=round(current_stoch_k, 2),
        stoch_rsi_d=round(current_stoch_d, 2),
        support_level=round(support_level, 2),
        resistance_level=round(resistance_level, 2),
        economic_pressure=economic_pressure,
        momentum_state=momentum_state,
        structure_score=structure_score,
    )
