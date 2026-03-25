from fastapi import APIRouter, HTTPException, Query

from app.models.news import NewsResponse
from app.services.cache_db import cache_get
from app.services.refresh_service import refresh_symbol_cache
from app.services.refresh_tasks import run_once

router = APIRouter()


def _empty_news(symbol: str) -> NewsResponse:
    return NewsResponse(
        symbol=symbol,
        ticker_news=[],
        macro_news=[],
    )


@router.get("/{symbol}/news", response_model=NewsResponse)
def ticker_news(symbol: str):
    symbol = symbol.upper().strip()
    cache_key = f"news:{symbol}"

    fresh = cache_get(cache_key, max_age_seconds=900)
    if fresh:
        return NewsResponse(**fresh)

    stale = cache_get(cache_key, max_age_seconds=60 * 60 * 24)
    if stale:
        run_once(f"news-refresh:{symbol}", refresh_symbol_cache, symbol)
        return NewsResponse(**stale)

    run_once(f"news-refresh:{symbol}", refresh_symbol_cache, symbol)
    return _empty_news(symbol)


@router.post("/{symbol}/refresh")
def ticker_refresh(
    symbol: str,
    interval: str = Query("1day"),
    range: str = Query("1Y"),
):
    symbol = symbol.upper().strip()
    try:
        return refresh_symbol_cache(symbol=symbol, interval=interval, range_label=range)
    except Exception as exc:
        raise HTTPException(status_code=400, detail=str(exc))