from fastapi import APIRouter, HTTPException, Query

from app.models.ticker import (
    BiasInfo,
    GuidanceInfo,
    PriceContext,
    ProfessionalAnalysis,
    TechnicalContext,
    TickerAnalysisResponse,
)
from app.services.cache_db import cache_get
from app.services.refresh_service import refresh_symbol_cache
from app.services.refresh_tasks import run_once
from app.services.market_data_service import get_price_context
from app.services.technical_service import get_technical_context
from app.services.news_service import get_symbol_news_bundle
from app.services.bias_service import calculate_bias
from app.services.guidance_service import build_guidance
from app.services.pro_analysis_service import build_professional_analysis
from app.utils.market_hours import get_market_status
from app.utils.symbols import company_name

router = APIRouter()


def _empty_summary(symbol: str) -> TickerAnalysisResponse:
    return TickerAnalysisResponse(
        symbol=symbol,
        company_name=company_name(symbol),
        market_status="LOADING",
        price_context=PriceContext(
            current_price=0.0,
            previous_close=0.0,
            daily_change=0.0,
            daily_change_percent=0.0,
            trend_5d="unknown",
        ),
        technical_context=TechnicalContext(
            trend_short="unknown",
            trend_medium="unknown",
            price_vs_20d="unknown",
            price_vs_50d="unknown",
            distance_from_20d_percent=0.0,
            distance_from_50d_percent=0.0,
            momentum_state="unknown",
            structure_score=0,
        ),
        bias=BiasInfo(
            label="LOADING",
            confidence_label="Loading",
            confidence_value=0,
            internal_score=0,
            total_score=0,
            news_score=0,
            technical_score=0,
            confirmation_score=0,
            bullish_count=0,
            bearish_count=0,
            neutral_count=0,
        ),
        guidance=GuidanceInfo(
            headline="Refreshing analysis",
            summary="MarketPulse is building the first cached view for this ticker.",
            preferred_direction="neutral",
            warnings=["Initial background refresh is in progress."],
        ),
        professional_analysis=ProfessionalAnalysis(
            regime="loading",
            primary_driver="building_cache",
            secondary_drivers=[],
            confirmation=[],
            invalidation=[],
            tactical_stance="Initial ticker analysis is being prepared.",
            key_risks=["Initial cache has not been built yet."],
            executive_summary="MarketPulse is preparing the first summary for this ticker.",
            plain_english_summary="The first cached analysis is being built in the background. Reload shortly.",
        ),
        interpreted_ticker_news=[],
        interpreted_macro_news=[],
    )


@router.get("/{symbol}/summary", response_model=TickerAnalysisResponse)
def ticker_summary(
    symbol: str,
    interval: str = Query("1day", description="1min, 5min, 15min, 1h, 1day, 1week, 1month"),
):
    symbol = symbol.upper().strip()
    cache_key = f"summary:{symbol}:{interval}"

    fresh = cache_get(cache_key, max_age_seconds=900)
    if fresh:
        return TickerAnalysisResponse(**fresh)

    stale = cache_get(cache_key, max_age_seconds=60 * 60 * 24)
    if stale:
        run_once(f"summary-refresh:{symbol}:{interval}", refresh_symbol_cache, symbol, interval)
        return TickerAnalysisResponse(**stale)

    run_once(f"summary-refresh:{symbol}:{interval}", refresh_symbol_cache, symbol, interval)
    return _empty_summary(symbol)


@router.get("/{symbol}/analysis", response_model=TickerAnalysisResponse)
def ticker_analysis(
    symbol: str,
    interval: str = Query("1day", description="1min, 5min, 15min, 1h, 1day, 1week, 1month"),
):
    symbol = symbol.upper().strip()

    try:
        price_context = get_price_context(symbol)
        technical_context = get_technical_context(symbol)
        news_bundle = get_symbol_news_bundle(symbol)
        bias = calculate_bias(news_bundle, technical_context)
        market_status = get_market_status()

        guidance = build_guidance(
            symbol=symbol,
            bias=bias,
            market_status=market_status["market_status"],
            interval=interval,
        )

        professional_analysis = build_professional_analysis(
            symbol=symbol,
            bias=bias,
            price_context=price_context,
            technical_context=technical_context,
            news_bundle=news_bundle,
            market_status=market_status["market_status"],
        )

        return TickerAnalysisResponse(
            symbol=symbol,
            company_name=company_name(symbol),
            market_status=market_status["market_status"],
            price_context=price_context,
            technical_context=technical_context,
            bias=bias,
            guidance=guidance,
            professional_analysis=professional_analysis,
            interpreted_ticker_news=news_bundle["ticker_news"],
            interpreted_macro_news=news_bundle["macro_news"],
        )
    except Exception as exc:
        raise HTTPException(status_code=400, detail=str(exc))