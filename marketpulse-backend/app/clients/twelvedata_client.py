import pandas as pd
import requests
from app.core.config import settings


def fetch_intraday_history(symbol: str, interval: str, outputsize: int = 1000) -> pd.DataFrame:
    if not settings.twelve_data_api_key:
        raise ValueError("TWELVE_DATA_API_KEY is missing")

    url = "https://api.twelvedata.com/time_series"
    params = {
        "symbol": symbol.upper(),
        "interval": interval,
        "outputsize": outputsize,
        "apikey": settings.twelve_data_api_key,
        "format": "JSON",
        "timezone": "America/New_York",
        "order": "ASC",
    }

    response = requests.get(url, params=params, timeout=30)
    response.raise_for_status()
    data = response.json()

    if data.get("status") == "error":
        raise RuntimeError(data.get("message", "Unknown Twelve Data error"))

    values = data.get("values")
    if not values:
        raise ValueError(f"No intraday data returned for {symbol}")

    parsed = []
    for item in values:
        try:
            parsed.append({
                "datetime": pd.to_datetime(item["datetime"]),
                "open": float(item["open"]),
                "high": float(item["high"]),
                "low": float(item["low"]),
                "close": float(item["close"]),
                "volume": float(item.get("volume", 0) or 0),
            })
        except (ValueError, KeyError, TypeError):
            continue

    df = pd.DataFrame(parsed)
    if df.empty:
        raise ValueError(f"No usable intraday data returned for {symbol}")

    return df.sort_values("datetime").reset_index(drop=True)
