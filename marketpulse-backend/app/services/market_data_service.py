from __future__ import annotations

from app.clients.stooq_client import fetch_daily_history
from app.models.ticker import PriceContext


def get_price_context(symbol: str) -> PriceContext:
    df = fetch_daily_history(symbol)

    if len(df) < 2:
        raise ValueError(f"Not enough price history to build context for {symbol}")

    latest = df.iloc[-1]
    previous = df.iloc[-2]

    current_price = float(latest["close"])
    previous_close = float(previous["close"])
    daily_change = current_price - previous_close
    daily_change_percent = (daily_change / previous_close * 100.0) if previous_close else 0.0

    # basic 5-day trend
    if len(df) >= 6:
        close_now = float(df.iloc[-1]["close"])
        close_5d_ago = float(df.iloc[-6]["close"])
        if close_now > close_5d_ago:
            trend_5d = "up"
        elif close_now < close_5d_ago:
            trend_5d = "down"
        else:
            trend_5d = "flat"
    else:
        trend_5d = "unknown"

    return PriceContext(
        current_price=round(current_price, 2),
        previous_close=round(previous_close, 2),
        daily_change=round(daily_change, 2),
        daily_change_percent=round(daily_change_percent, 2),
        trend_5d=trend_5d,
    )