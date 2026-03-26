from fastapi import APIRouter, HTTPException, Query

from app.models.news import NewsResponse
from app.models.ticker import PriceContext, TechnicalContext
from app.services.cache_db import cache_get
from app.services.news_service import enrich_news_bundle_with_market_context, filter_news_bundle_for_interval
from app.services.refresh_service import refresh_symbol_cache
from app.services.refresh_tasks import run_once

router = APIRouter()


def _empty_news(symbol: str) -> NewsResponse:
    return NewsResponse(
        symbol=symbol,
        ticker_news=[],
        macro_news=[],
    )


def _enrich_cached_news(symbol: str, interval: str, news_bundle: dict) -> dict:
    price_cached = cache_get(f"price:{symbol}", max_age_seconds=60 * 60)
    technical_cached = cache_get(f"technical:{symbol}:{interval}", max_age_seconds=60 * 60)

    if not price_cached or not technical_cached:
        return news_bundle

    return enrich_news_bundle_with_market_context(
        symbol=symbol,
        price_context=PriceContext(**price_cached),
        technical_context=TechnicalContext(**technical_cached),
        news_bundle=news_bundle,
        interval=interval,
    )


@router.get("/{symbol}/news", response_model=NewsResponse)
def ticker_news(
    symbol: str,
    interval: str = Query("1day", description="1day, 1week, 1month"),
):
    symbol = symbol.upper().strip()
    cache_key = f"news:{symbol}"

    fresh = cache_get(cache_key, max_age_seconds=900)
    if fresh:
        filtered = _enrich_cached_news(symbol, interval, filter_news_bundle_for_interval(fresh, interval))
        return NewsResponse(symbol=symbol, **filtered)

    stale = cache_get(cache_key, max_age_seconds=60 * 60 * 24)
    if stale:
        run_once(f"news-refresh:{symbol}:{interval}", refresh_symbol_cache, symbol, interval)
        filtered = _enrich_cached_news(symbol, interval, filter_news_bundle_for_interval(stale, interval))
        return NewsResponse(symbol=symbol, **filtered)

    run_once(f"news-refresh:{symbol}:{interval}", refresh_symbol_cache, symbol, interval)
    return _empty_news(symbol)


@router.post("/{symbol}/refresh")
def ticker_refresh(
    symbol: str,
    interval: str = Query("1day"),
    range: str = Query("1Y"),
):
    symbol = symbol.upper().strip()
    try:
        queued = run_once(
            f"summary-refresh:{symbol}:{interval}",
            refresh_symbol_cache,
            symbol,
            interval,
            range,
        )
        return {
            "status": "queued" if queued else "already_running",
            "symbol": symbol,
            "interval": interval,
            "range": range,
        }
    except Exception as exc:
        raise HTTPException(status_code=400, detail=str(exc))
