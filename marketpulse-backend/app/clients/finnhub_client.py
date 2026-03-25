from __future__ import annotations

from datetime import UTC, datetime, timedelta
from typing import Any

import requests

from app.core.config import settings

BASE_URL = "https://finnhub.io/api/v1"


def _headers() -> dict[str, str]:
    if not settings.finnhub_api_key:
        raise ValueError("FINNHUB_API_KEY is missing")
    return {"X-Finnhub-Token": settings.finnhub_api_key}


def _ts_to_iso(ts: Any) -> str | None:
    if ts is None:
        return None
    try:
        return datetime.fromtimestamp(int(ts), tz=UTC).isoformat()
    except Exception:
        return None


def _normalize_article(item: dict[str, Any]) -> dict[str, Any]:
    return {
        "source": {"name": item.get("source") or "Finnhub"},
        "author": None,
        "title": item.get("headline") or "",
        "description": item.get("summary") or "",
        "url": item.get("url") or "",
        "urlToImage": item.get("image") or "",
        "publishedAt": _ts_to_iso(item.get("datetime")),
        "content": item.get("summary") or "",
    }


def fetch_ticker_news(symbol: str, days_back: int = 5) -> list[dict]:
    end_date = datetime.now(UTC).date()
    start_date = end_date - timedelta(days=days_back)

    response = requests.get(
        f"{BASE_URL}/company-news",
        headers=_headers(),
        params={
            "symbol": symbol.upper().strip(),
            "from": start_date.isoformat(),
            "to": end_date.isoformat(),
        },
        timeout=15,
    )
    response.raise_for_status()
    data = response.json()

    if not isinstance(data, list):
        raise RuntimeError(f"Unexpected Finnhub company-news response: {data}")

    return [_normalize_article(item) for item in data]


def fetch_macro_news(category: str = "general") -> list[dict]:
    response = requests.get(
        f"{BASE_URL}/news",
        headers=_headers(),
        params={"category": category},
        timeout=15,
    )
    response.raise_for_status()
    data = response.json()

    if not isinstance(data, list):
        raise RuntimeError(f"Unexpected Finnhub market-news response: {data}")

    return [_normalize_article(item) for item in data]