import json
from typing import Any, Optional

from openai import OpenAI

from app.core.config import settings
from app.services.news_cache import cache


NEWS_SCHEMA: dict[str, Any] = {
    "type": "object",
    "properties": {
        "article_type": {
            "type": "string",
            "enum": [
                "earnings",
                "guidance",
                "analyst_action",
                "macro",
                "geopolitical",
                "product",
                "ceo_commentary",
                "partnership",
                "regulatory",
                "general",
            ],
        },
        "relevance": {
            "type": "string",
            "enum": ["low", "medium", "high"],
        },
        "direction": {
            "type": "string",
            "enum": ["bullish", "bearish", "neutral", "mixed"],
        },
        "confidence": {
            "type": "string",
            "enum": ["low", "medium", "high"],
        },
        "impact": {
            "type": "string",
            "enum": ["low", "medium", "high"],
        },
        "directness": {
            "type": "string",
            "enum": ["direct", "indirect"],
        },
        "summary": {"type": "string"},
        "explanation": {"type": "string"},
        "mentioned_tickers": {
            "type": "array",
            "items": {"type": "string"},
        },
    },
    "required": [
        "article_type",
        "relevance",
        "direction",
        "confidence",
        "impact",
        "directness",
        "summary",
        "explanation",
        "mentioned_tickers",
    ],
    "additionalProperties": False,
}


def get_openai_client() -> Optional[OpenAI]:
    if not settings.openai_api_key:
        return None
    return OpenAI(api_key=settings.openai_api_key)


def _build_prompt(
    symbol: str,
    company_name: str,
    headline: str,
    snippet: str,
    timeframe: str,
) -> str:
    return f"""
You are a professional market-impact analyst.

Task:
Interpret the likely market impact of this article for the given asset.

Ticker: {symbol}
Company: {company_name}
Timeframe of interest: {timeframe}

Headline:
{headline}

Snippet:
{snippet}

Rules:
- Focus on market impact, not generic sentiment.
- Judge whether the article is directly relevant to the ticker.
- Distinguish between narrative impact and fundamental impact.
- If the information is speculative or weak, lower confidence.
- If unclear, return neutral or mixed rather than forcing a direction.
- Return only valid JSON.
""".strip()


def _call_model(
    client: OpenAI,
    model_name: str,
    prompt: str,
) -> dict:
    response = client.responses.create(
        model=model_name,
        input=prompt,
        text={
            "format": {
                "type": "json_schema",
                "name": "news_interpretation",
                "schema": NEWS_SCHEMA,
                "strict": True,
            }
        },
    )
    return json.loads(response.output_text)


def _should_escalate(result: dict) -> bool:
    if result.get("confidence") == "low":
        return True
    if result.get("direction") == "mixed":
        return True
    if result.get("relevance") == "low":
        return False
    return False


def interpret_news_article(
    symbol: str,
    company_name: str,
    headline: str,
    snippet: str,
    timeframe: str = "1day",
) -> Optional[dict]:
    client = get_openai_client()
    if client is None:
        return None

    prompt = _build_prompt(symbol, company_name, headline, snippet, timeframe)

    primary_model = settings.openai_news_model_primary
    fallback_model = settings.openai_news_model_fallback

    primary_cache_key = cache.make_key(
        symbol=symbol,
        headline=headline,
        snippet=snippet,
        timeframe=timeframe,
        model_name=primary_model,
        prompt_version="v1",
    )

    if settings.openai_enable_news_cache:
        cached = cache.get(primary_cache_key)
        if cached is not None:
            return cached

    result = _call_model(client, primary_model, prompt)

    if (
        settings.openai_escalate_low_confidence
        and fallback_model
        and fallback_model != primary_model
        and _should_escalate(result)
    ):
        fallback_cache_key = cache.make_key(
            symbol=symbol,
            headline=headline,
            snippet=snippet,
            timeframe=timeframe,
            model_name=fallback_model,
            prompt_version="v1",
        )

        if settings.openai_enable_news_cache:
            cached_fallback = cache.get(fallback_cache_key)
            if cached_fallback is not None:
                return cached_fallback

        result = _call_model(client, fallback_model, prompt)

        if settings.openai_enable_news_cache:
            cache.set(fallback_cache_key, result)

        return result

    if settings.openai_enable_news_cache:
        cache.set(primary_cache_key, result)

    return result