from __future__ import annotations

from datetime import UTC
from email.utils import parsedate_to_datetime
from urllib.parse import quote_plus

import feedparser


def _to_iso(value: str | None) -> str | None:
    if not value:
        return None
    try:
        dt = parsedate_to_datetime(value)
        if dt.tzinfo is None:
            dt = dt.replace(tzinfo=UTC)
        return dt.astimezone(UTC).isoformat()
    except Exception:
        return None


def _normalize_entry(entry, source_name: str) -> dict:
    return {
        "source": {"name": source_name},
        "author": None,
        "title": getattr(entry, "title", "") or "",
        "description": getattr(entry, "summary", "") or "",
        "url": getattr(entry, "link", "") or "",
        "urlToImage": "",
        "publishedAt": _to_iso(getattr(entry, "published", None)),
        "content": getattr(entry, "summary", "") or "",
    }


def fetch_google_news_rss(query: str, limit: int = 5) -> list[dict]:
    rss_url = (
        "https://news.google.com/rss/search?"
        f"q={quote_plus(query)}&hl=en-US&gl=US&ceid=US:en"
    )
    feed = feedparser.parse(rss_url)
    return [_normalize_entry(entry, "Google News RSS") for entry in feed.entries[:limit]]


def fetch_ticker_fallback_news(symbol: str, company_name: str, limit: int = 4) -> list[dict]:
    query = f'"{symbol}" OR "{company_name}" stock earnings guidance'
    return fetch_google_news_rss(query=query, limit=limit)


def fetch_macro_fallback_news(limit: int = 3) -> list[dict]:
    query = '"Federal Reserve" OR FOMC OR inflation OR CPI OR "interest rates" OR Nasdaq OR "S&P 500"'
    return fetch_google_news_rss(query=query, limit=limit)