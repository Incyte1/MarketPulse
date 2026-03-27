from __future__ import annotations

import pandas as pd

from app.intelligence.config import IntelligenceConfig
from app.intelligence.indicators import (
    as_float_series,
    atr,
    moving_average,
    percent_change,
    percent_distance,
    realized_volatility,
    rsi,
    slope_percent,
)
from app.intelligence.market_data import MarketDataBundle
from app.models.intelligence import FeatureSnapshot


def _latest(series: pd.Series, default: float = 0.0) -> float:
    clean = as_float_series(series).dropna()
    if clean.empty:
        return default
    return float(clean.iloc[-1])


def _series_tail_mean(series: pd.Series, window: int, default: float = 0.0) -> float:
    clean = as_float_series(series).dropna()
    if clean.empty:
        return default
    return float(clean.tail(window).mean())


def _fraction_above(close: pd.Series, moving_average_series: pd.Series, window: int) -> float:
    paired = pd.DataFrame({"close": as_float_series(close), "ma": as_float_series(moving_average_series)}).dropna()
    if paired.empty:
        return 0.5
    windowed = paired.tail(window)
    if windowed.empty:
        return 0.5
    return float((windowed["close"] > windowed["ma"]).mean())


def _higher_highs(high: pd.Series, window: int) -> bool:
    clean = as_float_series(high).dropna()
    if len(clean) < window:
        return False
    recent = clean.tail(window // 2)
    previous = clean.tail(window).head(window // 2)
    if recent.empty or previous.empty:
        return False
    return float(recent.max()) > float(previous.max())


def _higher_lows(low: pd.Series, window: int) -> bool:
    clean = as_float_series(low).dropna()
    if len(clean) < window:
        return False
    recent = clean.tail(window // 2)
    previous = clean.tail(window).head(window // 2)
    if recent.empty or previous.empty:
        return False
    return float(recent.min()) > float(previous.min())


def _gap_risk_percent(df: pd.DataFrame, window: int) -> float:
    open_series = as_float_series(df["open"])
    close_series = as_float_series(df["close"])
    previous_close = close_series.shift(1)
    gaps = ((open_series - previous_close).abs() / previous_close.replace(0.0, pd.NA)) * 100.0
    return _series_tail_mean(gaps.fillna(0.0), window=window)


def _whipsaw_ratio(close: pd.Series, window: int) -> float:
    returns = as_float_series(close).pct_change().dropna()
    if len(returns) < 3:
        return 0.0
    signs = returns.tail(window).apply(lambda value: 1 if value > 0 else (-1 if value < 0 else 0))
    sign_changes = 0
    comparable = signs.tolist()
    for index in range(1, len(comparable)):
        if comparable[index] == 0 or comparable[index - 1] == 0:
            continue
        if comparable[index] != comparable[index - 1]:
            sign_changes += 1
    denominator = max(len(comparable) - 1, 1)
    return sign_changes / denominator


def _distance_to_level(current: float, level: float) -> float:
    if level == 0.0:
        return 0.0
    return ((level - current) / level) * 100.0


def build_feature_snapshot(bundle: MarketDataBundle, config: IntelligenceConfig) -> FeatureSnapshot:
    windows = config.windows
    price_df = bundle.price_history
    benchmark_df = bundle.benchmark_history
    sector_df = bundle.sector_history

    close = as_float_series(price_df["close"])
    high = as_float_series(price_df["high"])
    low = as_float_series(price_df["low"])
    volume = as_float_series(price_df["volume"]).fillna(0.0)
    benchmark_close = as_float_series(benchmark_df["close"])
    sector_close = as_float_series(sector_df["close"])

    current_price = _latest(close)
    previous_close = float(close.iloc[-2]) if len(close.dropna()) >= 2 else current_price
    one_day_change_pct = percent_distance(current_price, previous_close)

    ma_20_series = moving_average(close, 20)
    ma_50_series = moving_average(close, 50)
    ma_200_series = moving_average(close, windows.long_ma_window)
    atr_series = atr(price_df, windows.atr_period)
    rsi_series = rsi(close, windows.rsi_period)
    realized_vol_series = realized_volatility(close, windows.volatility_window)
    atr_pct_series = (atr_series / close.replace(0.0, pd.NA) * 100.0).fillna(0.0)

    current_atr = _latest(atr_series)
    current_atr_pct = _latest(atr_pct_series)
    atr_baseline = _series_tail_mean(atr_pct_series, windows.trend_window, default=current_atr_pct or 1.0)
    support_20d = float(low.tail(windows.medium_return).min()) if not low.empty else current_price
    resistance_20d = float(high.tail(windows.medium_return).max()) if not high.empty else current_price
    resistance_60d = float(high.tail(windows.long_return).max()) if not high.empty else current_price

    volume_baseline = float(volume.tail(windows.volume_window).mean()) if not volume.empty else 0.0
    volume_ratio_20 = float(volume.iloc[-1] / volume_baseline) if volume_baseline > 0.0 else 1.0

    symbol_returns = close.pct_change()
    benchmark_returns = benchmark_close.pct_change()
    relative_outperformance = (symbol_returns > benchmark_returns).astype("float64")

    return FeatureSnapshot(
        as_of=str(pd.to_datetime(price_df.iloc[-1]["datetime"]).isoformat()),
        benchmark_symbol=bundle.benchmark_symbol,
        sector_etf=bundle.sector_etf,
        current_price=round(current_price, 2),
        one_day_change_pct=round(one_day_change_pct, 2),
        return_5d=round(percent_change(close, windows.short_return), 2),
        return_20d=round(percent_change(close, windows.medium_return), 2),
        return_60d=round(percent_change(close, windows.long_return), 2),
        benchmark_return_20d=round(percent_change(benchmark_close, windows.medium_return), 2),
        benchmark_return_60d=round(percent_change(benchmark_close, windows.long_return), 2),
        sector_return_20d=round(percent_change(sector_close, windows.medium_return), 2),
        relative_strength_20d=round(
            percent_change(close, windows.medium_return) - percent_change(benchmark_close, windows.medium_return),
            2,
        ),
        relative_strength_60d=round(
            percent_change(close, windows.long_return) - percent_change(benchmark_close, windows.long_return),
            2,
        ),
        sector_relative_strength_20d=round(
            percent_change(close, windows.medium_return) - percent_change(sector_close, windows.medium_return),
            2,
        ),
        outperform_days_20_ratio=round(float(relative_outperformance.tail(windows.medium_return).mean()), 3),
        volume_ratio_20=round(volume_ratio_20, 2),
        ma_20=round(_latest(ma_20_series), 2),
        ma_50=round(_latest(ma_50_series), 2),
        ma_200=round(_latest(ma_200_series), 2),
        distance_from_ma_20_pct=round(percent_distance(current_price, _latest(ma_20_series)), 2),
        distance_from_ma_50_pct=round(percent_distance(current_price, _latest(ma_50_series)), 2),
        distance_from_ma_200_pct=round(percent_distance(current_price, _latest(ma_200_series)), 2),
        ma_20_slope_pct=round(slope_percent(ma_20_series, windows.short_return), 2),
        ma_50_slope_pct=round(slope_percent(ma_50_series, windows.medium_return), 2),
        ma_200_slope_pct=round(slope_percent(ma_200_series, windows.medium_return), 2),
        trend_persistence_20=round(_fraction_above(close, ma_20_series, windows.trend_window), 3),
        higher_highs_20=_higher_highs(high, windows.trend_window),
        higher_lows_20=_higher_lows(low, windows.trend_window),
        rsi_14=round(_latest(rsi_series, default=50.0), 2),
        atr_14=round(current_atr, 2),
        atr_14_pct=round(current_atr_pct, 2),
        realized_vol_20_pct=round(_latest(realized_vol_series), 2),
        gap_risk_20_pct=round(_gap_risk_percent(price_df, windows.medium_return), 2),
        whipsaw_ratio_10=round(_whipsaw_ratio(close, windows.whipsaw_window), 3),
        compression_ratio_20=round((current_atr_pct / atr_baseline) if atr_baseline > 0.0 else 1.0, 3),
        drawdown_from_63d_high_pct=round(_distance_to_level(current_price, resistance_60d), 2),
        support_20d=round(support_20d, 2),
        resistance_20d=round(resistance_20d, 2),
        resistance_60d=round(resistance_60d, 2),
        distance_to_20d_high_pct=round(_distance_to_level(current_price, resistance_20d), 2),
        distance_to_20d_low_pct=round(percent_distance(current_price, support_20d), 2),
        distance_to_60d_high_pct=round(_distance_to_level(current_price, resistance_60d), 2),
    )
