from __future__ import annotations

from io import StringIO

import pandas as pd
import requests

from app.core.config import settings


def _normalize_df(df: pd.DataFrame, symbol: str) -> pd.DataFrame:
    if df is None or df.empty:
        raise ValueError(f"No usable price data returned for {symbol}")

    # normalize lowercase columns
    df.columns = [str(c).strip().lower() for c in df.columns]

    rename_map = {
        "date": "datetime",
    }
    df = df.rename(columns=rename_map)

    required = ["open", "high", "low", "close"]
    for col in required:
        if col not in df.columns:
            raise ValueError(f"Missing required column '{col}' for {symbol}")

    if "datetime" not in df.columns:
        raise ValueError(f"Missing datetime column for {symbol}")

    if "volume" not in df.columns:
        df["volume"] = 0

    df["datetime"] = pd.to_datetime(df["datetime"], errors="coerce")
    df = df.dropna(subset=["datetime"]).copy()

    for col in ["open", "high", "low", "close", "volume"]:
        df[col] = pd.to_numeric(df[col], errors="coerce")

    df = df.dropna(subset=["open", "high", "low", "close"]).copy()
    df = df.sort_values("datetime").drop_duplicates(subset=["datetime"], keep="last")
    df = df.reset_index(drop=True)

    if df.empty:
        raise ValueError(f"No usable price rows remained for {symbol}")

    return df[["datetime", "open", "high", "low", "close", "volume"]]


def fetch_daily_history_from_twelve_data(symbol: str, outputsize: int = 260) -> pd.DataFrame:
    if not settings.twelve_data_api_key:
        raise ValueError("TWELVE_DATA_API_KEY is missing")

    url = "https://api.twelvedata.com/time_series"
    params = {
        "symbol": symbol.upper().strip(),
        "interval": "1day",
        "outputsize": outputsize,
        "apikey": settings.twelve_data_api_key,
        "format": "JSON",
        "order": "ASC",
    }

    response = requests.get(url, params=params, timeout=20)
    response.raise_for_status()
    data = response.json()

    if isinstance(data, dict) and data.get("status") == "error":
        message = data.get("message") or f"Twelve Data returned error for {symbol}"
        raise ValueError(message)

    values = data.get("values")
    if not values or not isinstance(values, list):
        raise ValueError(f"No usable Twelve Data history returned for {symbol}")

    df = pd.DataFrame(values)
    if df.empty:
        raise ValueError(f"No usable Twelve Data history returned for {symbol}")

    df = df.rename(columns={"datetime": "datetime"})
    return _normalize_df(df, symbol)


def fetch_daily_history_from_stooq(symbol: str) -> pd.DataFrame:
    # Stooq often wants US ETF symbols with .us
    stooq_symbol = f"{symbol.lower()}.us"
    url = f"https://stooq.com/q/d/l/?s={stooq_symbol}&i=d"

    response = requests.get(url, timeout=20)
    response.raise_for_status()

    text = response.text.strip()
    if not text or "No data" in text:
        raise ValueError(f"No usable Stooq data returned for {symbol}")

    df = pd.read_csv(StringIO(text))
    if df.empty:
        raise ValueError(f"No usable Stooq data returned for {symbol}")

    return _normalize_df(df, symbol)


def fetch_daily_history(symbol: str) -> pd.DataFrame:
    errors: list[str] = []

    try:
        return fetch_daily_history_from_twelve_data(symbol)
    except Exception as exc:
        errors.append(f"Twelve Data: {exc}")

    try:
        return fetch_daily_history_from_stooq(symbol)
    except Exception as exc:
        errors.append(f"Stooq: {exc}")

    raise ValueError(" | ".join(errors) if errors else f"No usable data returned for {symbol}")