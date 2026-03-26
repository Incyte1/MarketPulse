from __future__ import annotations

from dataclasses import dataclass

import numpy as np
import pandas as pd

from app.clients.stooq_client import fetch_daily_history
from app.clients.twelvedata_client import fetch_intraday_history
from app.models.ticker import TechnicalContext

SHORT_TERM_INTERVALS = {"1min", "5min", "15min", "1h", "1day"}


@dataclass(frozen=True)
class TechnicalProfile:
    analysis_timeframe: str
    source_kind: str
    source_interval: str
    data_range: str
    calibration_window: str
    outputsize: int
    decision_bars: int
    fast_window: int
    medium_window: int
    slow_window: int
    rsi_period: int
    stoch_period: int
    smooth_k: int
    smooth_d: int
    macd_fast: int
    macd_slow: int
    macd_signal: int
    atr_period: int
    slope_lookback: int
    fast_indicator_label: str
    medium_indicator_label: str
    slow_indicator_label: str
    support_basis: str
    resistance_basis: str


SHORT_TERM_PROFILE = TechnicalProfile(
    analysis_timeframe="short_term",
    source_kind="intraday",
    source_interval="1h",
    data_range="1D",
    calibration_window="4D calibration built from 1-hour bars",
    outputsize=96,
    decision_bars=8,
    fast_window=5,
    medium_window=8,
    slow_window=21,
    rsi_period=8,
    stoch_period=8,
    smooth_k=3,
    smooth_d=3,
    macd_fast=5,
    macd_slow=13,
    macd_signal=4,
    atr_period=8,
    slope_lookback=4,
    fast_indicator_label="5-hour EMA",
    medium_indicator_label="8-hour EMA",
    slow_indicator_label="21-hour EMA",
    support_basis="1-day hourly swing low",
    resistance_basis="1-day hourly swing high",
)

LONG_TERM_PROFILE = TechnicalProfile(
    analysis_timeframe="long_term",
    source_kind="daily",
    source_interval="1day",
    data_range="1W",
    calibration_window="60D calibration built from 1-day bars",
    outputsize=60,
    decision_bars=5,
    fast_window=5,
    medium_window=10,
    slow_window=21,
    rsi_period=10,
    stoch_period=10,
    smooth_k=3,
    smooth_d=3,
    macd_fast=8,
    macd_slow=21,
    macd_signal=5,
    atr_period=10,
    slope_lookback=5,
    fast_indicator_label="5-day EMA",
    medium_indicator_label="10-day EMA",
    slow_indicator_label="21-day EMA",
    support_basis="1-week daily swing low",
    resistance_basis="1-week daily swing high",
)


def _profile_for_interval(interval: str) -> TechnicalProfile:
    if interval in {"1week", "1month"}:
        return LONG_TERM_PROFILE
    return SHORT_TERM_PROFILE


def _as_float_series(series: pd.Series) -> pd.Series:
    return pd.to_numeric(series, errors="coerce").astype("float64")


def _history_for_profile(symbol: str, profile: TechnicalProfile) -> pd.DataFrame:
    if profile.source_kind == "intraday":
        return fetch_intraday_history(symbol, interval=profile.source_interval, outputsize=profile.outputsize)
    return fetch_daily_history(symbol, outputsize=profile.outputsize)


def _ema(series: pd.Series, window: int) -> pd.Series:
    return series.ewm(span=window, adjust=False).mean()


def _rsi(close: pd.Series, period: int) -> pd.Series:
    close = _as_float_series(close)
    delta = close.diff()

    gain = delta.clip(lower=0.0)
    loss = -delta.clip(upper=0.0)

    avg_gain = gain.rolling(window=period, min_periods=period).mean()
    avg_loss = loss.rolling(window=period, min_periods=period).mean()

    rs = avg_gain / avg_loss.mask(avg_loss == 0.0, np.nan)
    rsi = 100.0 - (100.0 / (1.0 + rs))

    no_movement = avg_gain.eq(0.0) & avg_loss.eq(0.0)
    only_gains = avg_gain.gt(0.0) & avg_loss.eq(0.0)
    only_losses = avg_gain.eq(0.0) & avg_loss.gt(0.0)

    rsi = rsi.mask(only_gains, 100.0)
    rsi = rsi.mask(only_losses, 0.0)
    rsi = rsi.mask(no_movement, 50.0)
    return rsi.fillna(50.0).astype("float64")


def _macd(close: pd.Series, fast: int, slow: int, signal_window: int) -> tuple[pd.Series, pd.Series, pd.Series]:
    fast_ema = _ema(close, fast)
    slow_ema = _ema(close, slow)
    macd_line = fast_ema - slow_ema
    signal = _ema(macd_line, signal_window)
    histogram = macd_line - signal
    return macd_line, signal, histogram


def _stoch_rsi(
    close: pd.Series,
    period: int,
    smooth_k: int,
    smooth_d: int,
) -> tuple[pd.Series, pd.Series]:
    rsi = _rsi(close, period=period)
    min_rsi = rsi.rolling(window=period, min_periods=period).min()
    max_rsi = rsi.rolling(window=period, min_periods=period).max()
    rsi_range = max_rsi - min_rsi
    stoch = ((rsi - min_rsi) / rsi_range.mask(rsi_range == 0.0, np.nan)) * 100.0
    stoch = stoch.fillna(50.0).astype("float64")
    k = stoch.rolling(window=smooth_k, min_periods=1).mean().fillna(50.0).astype("float64")
    d = k.rolling(window=smooth_d, min_periods=1).mean().fillna(50.0).astype("float64")
    return k, d


def _atr(df: pd.DataFrame, period: int) -> pd.Series:
    high = _as_float_series(df["high"])
    low = _as_float_series(df["low"])
    close = _as_float_series(df["close"])
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


def _position(current: float, reference: float) -> str:
    if current > reference:
        return "above"
    if current < reference:
        return "below"
    return "at"


def _slope(series: pd.Series, lookback: int) -> float:
    clean = _as_float_series(series).dropna()
    if len(clean) <= lookback:
        return 0.0

    start = float(clean.iloc[-(lookback + 1)])
    end = float(clean.iloc[-1])
    if start == 0.0:
        return 0.0

    return ((end - start) / abs(start)) * 100.0


def _decision_window(df: pd.DataFrame, bars: int) -> pd.DataFrame:
    if df.empty:
        return df
    return df.tail(bars).reset_index(drop=True)


def _vwap(df: pd.DataFrame) -> float:
    if df.empty:
        return 0.0

    typical_price = (_as_float_series(df["high"]) + _as_float_series(df["low"]) + _as_float_series(df["close"])) / 3.0
    volume = _as_float_series(df["volume"]).fillna(0.0)
    weighted_volume = volume.where(volume > 0.0, 1.0)

    cumulative = (typical_price * weighted_volume).cumsum()
    volume_sum = weighted_volume.cumsum().replace(0.0, np.nan)
    vwap = cumulative / volume_sum
    latest = vwap.iloc[-1] if len(vwap) else np.nan
    return float(latest) if pd.notna(latest) else float(_as_float_series(df["close"]).iloc[-1])


def _range_position(current_close: float, support_level: float, resistance_level: float) -> float:
    span = resistance_level - support_level
    if span <= 0.0:
        return 50.0
    return max(0.0, min(100.0, ((current_close - support_level) / span) * 100.0))


def _volatility_state(current_atr: float, atr_series: pd.Series) -> str:
    atr_avg = float(_as_float_series(atr_series).tail(10).mean()) if not atr_series.empty else 0.0
    if atr_avg <= 0.0:
        return "normal"

    ratio = current_atr / atr_avg
    if ratio >= 1.2:
        return "expanded"
    if ratio <= 0.85:
        return "compressed"
    return "normal"


def _trend_score(
    current_close: float,
    fast_ema: float,
    medium_ema: float,
    slow_ema: float,
    fast_slope: float,
    medium_slope: float,
    decision_close: pd.Series,
) -> tuple[int, str, str]:
    score = 0

    if fast_ema > medium_ema > slow_ema:
        score += 3
        trend_medium = "bullish"
    elif fast_ema < medium_ema < slow_ema:
        score -= 3
        trend_medium = "bearish"
    else:
        trend_medium = "neutral"

    if current_close > medium_ema:
        score += 1
    elif current_close < medium_ema:
        score -= 1

    if fast_slope > 0 and medium_slope > 0:
        score += 1
    elif fast_slope < 0 and medium_slope < 0:
        score -= 1

    if len(decision_close) >= 2 and float(decision_close.iloc[-1]) > float(decision_close.iloc[0]):
        trend_short = "bullish"
    elif len(decision_close) >= 2 and float(decision_close.iloc[-1]) < float(decision_close.iloc[0]):
        trend_short = "bearish"
    else:
        trend_short = "neutral"

    return score, trend_short, trend_medium


def _momentum_score(
    current_rsi: float,
    current_macd: float,
    current_macd_signal: float,
    current_macd_hist: float,
    current_stoch_k: float,
    current_stoch_d: float,
) -> tuple[int, str]:
    score = 0

    if current_macd > current_macd_signal and current_macd_hist >= 0:
        score += 2
    elif current_macd < current_macd_signal and current_macd_hist <= 0:
        score -= 2

    if current_rsi >= 58:
        score += 1
        momentum_state = "positive"
    elif current_rsi <= 42:
        score -= 1
        momentum_state = "negative"
    else:
        momentum_state = "neutral"

    if current_stoch_k > current_stoch_d and current_stoch_k < 85:
        score += 1
    elif current_stoch_k < current_stoch_d and current_stoch_k > 15:
        score -= 1

    return score, momentum_state


def _level_score(
    current_close: float,
    support_level: float,
    resistance_level: float,
    range_position_percent: float,
    current_vwap: float,
    current_atr: float,
    current_macd: float,
    current_macd_signal: float,
    profile: TechnicalProfile,
) -> int:
    score = 0
    near_level_threshold = current_atr * 0.6 if current_atr > 0.0 else max(current_close * 0.002, 0.25)

    if current_close >= current_vwap:
        score += 1
    else:
        score -= 1

    if range_position_percent >= 70:
        score += 1
    elif range_position_percent <= 30:
        score -= 1

    if resistance_level - current_close <= near_level_threshold and current_macd > current_macd_signal:
        score += 1
    if current_close - support_level <= near_level_threshold and current_macd < current_macd_signal:
        score -= 1

    if profile.analysis_timeframe == "long_term" and range_position_percent >= 80:
        score += 1
    elif profile.analysis_timeframe == "long_term" and range_position_percent <= 20:
        score -= 1

    return score


def _exhaustion_score(current_rsi: float, current_stoch_k: float, range_position_percent: float) -> int:
    if current_rsi >= 75 or (current_stoch_k >= 90 and range_position_percent >= 85):
        return -1
    if current_rsi <= 25 or (current_stoch_k <= 10 and range_position_percent <= 15):
        return 1
    return 0


def _regime_state(trend_score: int, momentum_score: int, level_score: int, volatility_state: str) -> str:
    if trend_score >= 4 and momentum_score >= 2:
        return "trend_up"
    if trend_score <= -4 and momentum_score <= -2:
        return "trend_down"
    if volatility_state == "compressed" and abs(level_score) <= 1:
        return "compression"
    if volatility_state == "expanded" and abs(trend_score) <= 2:
        return "volatile_rotation"
    return "range"


def get_technical_context(symbol: str, interval: str = "1day") -> TechnicalContext:
    profile = _profile_for_interval(interval)
    df = _history_for_profile(symbol, profile)

    close = _as_float_series(df["close"]).dropna()
    if len(close) < profile.slow_window:
        raise ValueError(
            f"Not enough {profile.source_interval} history to compute {profile.analysis_timeframe} technical context for {symbol}"
        )

    fast_ema_series = _ema(close, profile.fast_window)
    medium_ema_series = _ema(close, profile.medium_window)
    slow_ema_series = _ema(close, profile.slow_window)
    rsi_series = _rsi(close, profile.rsi_period)
    macd_line, macd_signal, macd_hist = _macd(
        close,
        fast=profile.macd_fast,
        slow=profile.macd_slow,
        signal_window=profile.macd_signal,
    )
    stoch_k, stoch_d = _stoch_rsi(
        close,
        period=profile.stoch_period,
        smooth_k=profile.smooth_k,
        smooth_d=profile.smooth_d,
    )
    atr_series = _atr(df, profile.atr_period)

    current_close = float(close.iloc[-1])
    current_fast = float(fast_ema_series.iloc[-1])
    current_medium = float(medium_ema_series.iloc[-1])
    current_slow = float(slow_ema_series.iloc[-1])
    current_rsi = float(rsi_series.iloc[-1]) if pd.notna(rsi_series.iloc[-1]) else 50.0
    current_macd = float(macd_line.iloc[-1]) if pd.notna(macd_line.iloc[-1]) else 0.0
    current_macd_signal = float(macd_signal.iloc[-1]) if pd.notna(macd_signal.iloc[-1]) else 0.0
    current_macd_hist = float(macd_hist.iloc[-1]) if pd.notna(macd_hist.iloc[-1]) else 0.0
    current_stoch_k = float(stoch_k.iloc[-1]) if pd.notna(stoch_k.iloc[-1]) else 50.0
    current_stoch_d = float(stoch_d.iloc[-1]) if pd.notna(stoch_d.iloc[-1]) else 50.0
    current_atr = float(atr_series.iloc[-1]) if pd.notna(atr_series.iloc[-1]) else 0.0

    recent_window = _decision_window(df, profile.decision_bars)
    decision_close = _as_float_series(recent_window["close"]).dropna()
    decision_low = _as_float_series(recent_window["low"]).dropna()
    decision_high = _as_float_series(recent_window["high"]).dropna()
    support_level = float(decision_low.min()) if not decision_low.empty else current_close
    resistance_level = float(decision_high.max()) if not decision_high.empty else current_close
    current_vwap = _vwap(recent_window if not recent_window.empty else df.tail(profile.decision_bars))
    range_position_percent = _range_position(current_close, support_level, resistance_level)

    fast_slope = _slope(fast_ema_series, profile.slope_lookback)
    medium_slope = _slope(medium_ema_series, profile.slope_lookback)

    trend_score, trend_short, trend_medium = _trend_score(
        current_close=current_close,
        fast_ema=current_fast,
        medium_ema=current_medium,
        slow_ema=current_slow,
        fast_slope=fast_slope,
        medium_slope=medium_slope,
        decision_close=decision_close,
    )
    momentum_score, momentum_state = _momentum_score(
        current_rsi=current_rsi,
        current_macd=current_macd,
        current_macd_signal=current_macd_signal,
        current_macd_hist=current_macd_hist,
        current_stoch_k=current_stoch_k,
        current_stoch_d=current_stoch_d,
    )
    level_score = _level_score(
        current_close=current_close,
        support_level=support_level,
        resistance_level=resistance_level,
        range_position_percent=range_position_percent,
        current_vwap=current_vwap,
        current_atr=current_atr,
        current_macd=current_macd,
        current_macd_signal=current_macd_signal,
        profile=profile,
    )
    exhaustion_score = _exhaustion_score(
        current_rsi=current_rsi,
        current_stoch_k=current_stoch_k,
        range_position_percent=range_position_percent,
    )

    structure_score = int(trend_score + momentum_score + level_score + exhaustion_score)
    volatility_state = _volatility_state(current_atr, atr_series)
    regime_state = _regime_state(trend_score, momentum_score, level_score, volatility_state)

    price_vs_fast = _position(current_close, current_fast)
    price_vs_medium = _position(current_close, current_medium)
    price_vs_slow = _position(current_close, current_slow)

    distance_from_fast_percent = ((current_close - current_fast) / current_fast) * 100.0 if current_fast else 0.0
    distance_from_medium_percent = ((current_close - current_medium) / current_medium) * 100.0 if current_medium else 0.0
    distance_from_slow_percent = ((current_close - current_slow) / current_slow) * 100.0 if current_slow else 0.0

    economic_pressure = "neutral"
    if regime_state == "trend_down" or (price_vs_slow == "below" and volatility_state == "expanded"):
        economic_pressure = "risk_off"
    elif regime_state == "trend_up" or (price_vs_slow == "above" and volatility_state == "expanded"):
        economic_pressure = "risk_on"

    return TechnicalContext(
        analysis_timeframe=profile.analysis_timeframe,
        data_source_interval=profile.source_interval,
        data_range=profile.data_range,
        calibration_window=profile.calibration_window,
        fast_indicator_label=profile.fast_indicator_label,
        medium_indicator_label=profile.medium_indicator_label,
        slow_indicator_label=profile.slow_indicator_label,
        trend_short=trend_short,
        trend_medium=trend_medium,
        price_vs_20d=price_vs_fast,
        price_vs_50d=price_vs_medium,
        price_vs_200d=price_vs_slow,
        distance_from_20d_percent=round(distance_from_fast_percent, 2),
        distance_from_50d_percent=round(distance_from_medium_percent, 2),
        distance_from_200d_percent=round(distance_from_slow_percent, 2),
        ema_20=round(current_fast, 2),
        ema_50=round(current_medium, 2),
        ema_200=round(current_slow, 2),
        macd=round(current_macd, 4),
        macd_signal=round(current_macd_signal, 4),
        macd_histogram=round(current_macd_hist, 4),
        stoch_rsi_k=round(current_stoch_k, 2),
        stoch_rsi_d=round(current_stoch_d, 2),
        support_level=round(support_level, 2),
        resistance_level=round(resistance_level, 2),
        support_basis=profile.support_basis,
        resistance_basis=profile.resistance_basis,
        vwap=round(current_vwap, 2),
        atr=round(current_atr, 2),
        range_position_percent=round(range_position_percent, 1),
        trend_score=trend_score,
        momentum_score=momentum_score,
        level_score=level_score,
        exhaustion_score=exhaustion_score,
        volatility_state=volatility_state,
        regime_state=regime_state,
        economic_pressure=economic_pressure,
        momentum_state=momentum_state,
        structure_score=structure_score,
    )
