from __future__ import annotations

from app.models.ticker import PriceContext, TechnicalContext
from app.services.bias_service import calculate_bias
from app.services.cache_db import cache_get, cache_set
from app.services.guidance_service import build_guidance
from app.services.market_data_service import get_price_context
from app.services.news_service import get_symbol_news_bundle
from app.services.pro_analysis_service import build_professional_analysis
from app.services.technical_service import get_technical_context
from app.utils.market_hours import get_market_status
from app.utils.symbols import company_name


def _to_plain(value):
    if hasattr(value, "model_dump"):
        return value.model_dump()
    return value


def _get_price_context_cached(symbol: str) -> PriceContext:
    cache_key = f"price:{symbol}"

    cached = cache_get(cache_key, max_age_seconds=60)
    if cached:
        return PriceContext(**cached)

    context = get_price_context(symbol)
    cache_set(cache_key, "price", context.model_dump())
    return context


def _get_technical_context_cached(symbol: str) -> TechnicalContext:
    cache_key = f"technical:{symbol}"

    cached = cache_get(cache_key, max_age_seconds=60)
    if cached:
        return TechnicalContext(**cached)

    context = get_technical_context(symbol)
    cache_set(cache_key, "technical", context.model_dump())
    return context


def refresh_symbol_cache(symbol: str, interval: str = "1day", range_label: str = "1Y") -> dict:
    symbol = symbol.upper().strip()

    price_context = _get_price_context_cached(symbol)
    technical_context = _get_technical_context_cached(symbol)

    try:
        news_bundle = get_symbol_news_bundle(symbol)
    except Exception:
        existing_news = cache_get(f"news:{symbol}", max_age_seconds=60 * 60 * 24) or {}
        news_bundle = {
            "ticker_news": existing_news.get("ticker_news", []),
            "macro_news": existing_news.get("macro_news", []),
        }

    market_status_payload = get_market_status()
    market_status = market_status_payload.get("market_status", "UNKNOWN")

    bias = calculate_bias(news_bundle, technical_context)

    guidance = build_guidance(
        symbol=symbol,
        bias=bias,
        market_status=market_status,
        interval=interval,
    )

    professional_analysis = build_professional_analysis(
        symbol=symbol,
        bias=bias,
        price_context=price_context,
        technical_context=technical_context,
        news_bundle=news_bundle,
        market_status=market_status,
    )

    summary_payload = {
        "symbol": symbol,
        "company_name": company_name(symbol),
        "market_status": market_status,
        "price_context": _to_plain(price_context),
        "technical_context": _to_plain(technical_context),
        "bias": _to_plain(bias),
        "guidance": _to_plain(guidance),
        "professional_analysis": _to_plain(professional_analysis),
        "interpreted_ticker_news": [_to_plain(item) for item in news_bundle.get("ticker_news", [])],
        "interpreted_macro_news": [_to_plain(item) for item in news_bundle.get("macro_news", [])],
    }

    news_payload = {
        "symbol": symbol,
        "ticker_news": [_to_plain(item) for item in news_bundle.get("ticker_news", [])],
        "macro_news": [_to_plain(item) for item in news_bundle.get("macro_news", [])],
    }

    cache_set(f"summary:{symbol}:{interval}", "summary", summary_payload)
    cache_set(f"news:{symbol}", "news", news_payload)

    return {
        "status": "ok",
        "symbol": symbol,
        "refreshed": True,
        "summary_cache_key": f"summary:{symbol}:{interval}",
        "news_cache_key": f"news:{symbol}",
    }