from __future__ import annotations

import pandas as pd
import requests

YAHOO_INTERVALS = {
    "1min": "1m",
    "5min": "5m",
    "15min": "15m",
    "1h": "60m",
    "1day": "1d",
}

YAHOO_RANGES = {
    "1min": "7d",
    "5min": "30d",
    "15min": "60d",
    "1h": "60d",
    "1day": "2y",
}

YAHOO_HEADERS = {
    "User-Agent": "Mozilla/5.0",
    "Accept": "application/json",
}


def _normalize_chart(symbol: str, payload: dict, outputsize: int) -> pd.DataFrame:
    chart = payload.get("chart") or {}
    error = chart.get("error")
    if error:
        message = error.get("description") or error.get("code") or f"Yahoo Finance returned an error for {symbol}"
        raise ValueError(str(message))

    results = chart.get("result") or []
    if not results:
        raise ValueError(f"No Yahoo Finance chart data returned for {symbol}")

    result = results[0]
    timestamps = result.get("timestamp") or []
    quote_rows = ((result.get("indicators") or {}).get("quote") or [{}])[0]
    if not timestamps:
        raise ValueError(f"No Yahoo Finance timestamps returned for {symbol}")

    datetimes = pd.Series(
        pd.to_datetime(timestamps, unit="s", utc=True)
        .tz_convert("America/New_York")
        .tz_localize(None)
    )

    df = pd.DataFrame(
        {
            "datetime": datetimes,
            "open": pd.Series(quote_rows.get("open", [])),
            "high": pd.Series(quote_rows.get("high", [])),
            "low": pd.Series(quote_rows.get("low", [])),
            "close": pd.Series(quote_rows.get("close", [])),
            "volume": pd.Series(quote_rows.get("volume", [])),
        }
    )

    for column in ["open", "high", "low", "close", "volume"]:
        df[column] = pd.to_numeric(df[column], errors="coerce")

    df["volume"] = df["volume"].fillna(0.0)
    df = df.dropna(subset=["datetime", "open", "high", "low", "close"]).copy()
    df = df.sort_values("datetime").drop_duplicates(subset=["datetime"], keep="last")
    df = df.reset_index(drop=True)

    if df.empty:
        raise ValueError(f"No usable Yahoo Finance rows remained for {symbol}")

    if outputsize > 0:
        df = df.tail(outputsize).reset_index(drop=True)

    return df[["datetime", "open", "high", "low", "close", "volume"]]


def fetch_yahoo_history(symbol: str, interval: str, outputsize: int = 1000) -> pd.DataFrame:
    normalized_interval = interval.strip().lower()
    yahoo_interval = YAHOO_INTERVALS.get(normalized_interval)
    if yahoo_interval is None:
        raise ValueError(f"Unsupported Yahoo Finance interval '{interval}'")

    url = f"https://query1.finance.yahoo.com/v8/finance/chart/{symbol.upper().strip()}"
    params = {
        "interval": yahoo_interval,
        "range": YAHOO_RANGES[normalized_interval],
        "includePrePost": "false",
        "events": "div,splits",
    }

    response = requests.get(url, params=params, headers=YAHOO_HEADERS, timeout=20)
    response.raise_for_status()
    return _normalize_chart(symbol, response.json(), outputsize)


def fetch_daily_history_from_yahoo(symbol: str, outputsize: int = 260) -> pd.DataFrame:
    return fetch_yahoo_history(symbol, interval="1day", outputsize=outputsize)


def fetch_intraday_history_from_yahoo(symbol: str, interval: str, outputsize: int = 1000) -> pd.DataFrame:
    return fetch_yahoo_history(symbol, interval=interval, outputsize=outputsize)
