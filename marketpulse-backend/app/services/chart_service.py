from app.clients.stooq_client import fetch_daily_history
from app.clients.twelvedata_client import fetch_intraday_history
from app.utils.symbols import normalize_range
import pandas as pd


def _resample_ohlc(df: pd.DataFrame, rule: str) -> pd.DataFrame:
    temp = df.copy().set_index("datetime")
    out = temp.resample(rule).agg({
        "open": "first",
        "high": "max",
        "low": "min",
        "close": "last",
        "volume": "sum",
    }).dropna()
    return out.reset_index()


def _apply_range(df: pd.DataFrame, range_label: str) -> pd.DataFrame:
    if df.empty or range_label == "Max":
        return df

    end = df["datetime"].max()
    days_map = {
        "1D": 1,
        "5D": 5,
        "1M": 30,
        "3M": 90,
        "6M": 180,
        "1Y": 365,
        "5Y": 365 * 5,
    }
    days = days_map.get(range_label, 30)
    start = end - pd.Timedelta(days=days)
    filtered = df[df["datetime"] >= start].copy()
    return filtered if not filtered.empty else df


def get_chart_candles(symbol: str, interval: str, range_label: str) -> list[dict]:
    range_label = normalize_range(range_label)

    if interval in {"1min", "5min", "15min", "1h"}:
        df = fetch_intraday_history(symbol, interval=interval, outputsize=1000)
    else:
        df = fetch_daily_history(symbol)

        if interval == "1week":
            df = _resample_ohlc(df, "W")
        elif interval == "1month":
            df = _resample_ohlc(df, "ME")

    df = _apply_range(df, range_label)

    candles = []
    for _, row in df.iterrows():
        candles.append({
            "datetime": row["datetime"].isoformat(),
            "open": float(row["open"]),
            "high": float(row["high"]),
            "low": float(row["low"]),
            "close": float(row["close"]),
            "volume": float(row["volume"]),
        })
    return candles
