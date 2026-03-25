from __future__ import annotations

import re

from app.clients.finnhub_client import fetch_macro_news, fetch_ticker_news
from app.clients.scrape_fallback_client import (
    fetch_macro_fallback_news,
    fetch_ticker_fallback_news,
)
from app.core.config import settings
from app.models.ticker import InterpretedArticle
from app.utils.symbols import company_name

KNOWN_TICKERS = {
    "SPY", "QQQ", "AAPL", "NVDA", "TSLA", "MSFT",
    "AMZN", "META", "AMD", "GOOGL", "GOOG",
    "NFLX", "PLTR", "AVGO", "SMCI", "MU", "IWM", "DIA",
}

HIGH_QUALITY_SOURCES = {
    "reuters": 5,
    "bloomberg": 5,
    "wall street journal": 5,
    "wsj": 5,
    "barrons": 4,
    "cnbc": 4,
    "marketwatch": 3,
    "yahoo": 2,
    "google news rss": 2,
    "finnhub": 2,
}

ARTICLE_TYPE_KEYWORDS = {
    "earnings": ["earnings", "eps", "revenue", "guidance", "outlook"],
    "analyst": ["analyst", "upgrade", "downgrade", "price target"],
    "macro": ["fed", "federal reserve", "fomc", "inflation", "cpi", "ppi", "rates", "treasury"],
    "regulatory": ["sec", "lawsuit", "doj", "investigation", "probe"],
    "product": ["launch", "product", "release", "partnership", "deal", "contract"],
    "geopolitics": ["iran", "oil", "middle east", "war", "sanction", "attack"],
    "pricing": ["price cut", "pricing", "discount", "margin pressure"],
}

POSITIVE_TERMS = [
    "beats", "beat", "raises guidance", "strong demand", "approval",
    "partnership", "contract win", "record", "growth", "expansion", "upgrade",
]

NEGATIVE_TERMS = [
    "misses", "miss", "cuts guidance", "lawsuit", "investigation",
    "probe", "recall", "downgrade", "decline", "drop", "margin pressure", "slowdown",
]

ETF_MACRO_SYMBOLS = {"SPY", "QQQ", "IWM", "DIA"}


def _safe_text(value) -> str:
    return (str(value).strip() if value is not None else "")


def _text(article: dict) -> str:
    return " ".join(
        [
            _safe_text(article.get("title")),
            _safe_text(article.get("description")),
            _safe_text(article.get("content")),
        ]
    ).strip()


def _normalize_source(article: dict) -> str:
    source = article.get("source") or {}
    if isinstance(source, dict):
        return _safe_text(source.get("name")) or "Unknown"
    return "Unknown"


def _dedupe_articles(raw_articles: list[dict]) -> list[dict]:
    seen = set()
    output = []

    for article in raw_articles:
        title = _safe_text(article.get("title")).lower()
        url = _safe_text(article.get("url")).lower()
        key = url or re.sub(r"\s+", " ", title)

        if not key or key in seen:
            continue

        seen.add(key)
        output.append(article)

    return output


def _extract_tickers(text: str) -> list[str]:
    matches = re.findall(r"\b[A-Z]{2,5}\b", text)
    found = [x for x in matches if x in KNOWN_TICKERS]
    return list(dict.fromkeys(found))


def _detect_article_type(text: str) -> str:
    lower = text.lower()
    for article_type, words in ARTICLE_TYPE_KEYWORDS.items():
        if any(w in lower for w in words):
            return article_type
    return "general"


def _detect_direction(text: str) -> str:
    lower = text.lower()
    pos = sum(1 for x in POSITIVE_TERMS if x in lower)
    neg = sum(1 for x in NEGATIVE_TERMS if x in lower)

    if pos > neg:
      return "bullish"
    if neg > pos:
      return "bearish"
    return "neutral"


def _source_score(source: str) -> int:
    lower = source.lower()
    for name, score in HIGH_QUALITY_SOURCES.items():
        if name in lower:
            return score
    return 1


def _relevance_for_symbol(symbol: str, article_type: str, text: str) -> str:
    lower = text.lower()
    company = company_name(symbol).lower()
    symbol_lower = symbol.lower()

    if symbol_lower in lower or company in lower:
        return "high"

    if symbol in ETF_MACRO_SYMBOLS and article_type in {"macro", "geopolitics"}:
        return "high"

    if article_type in {"macro", "geopolitics", "regulatory"}:
        return "medium"

    return "low"


def _market_scope(symbol: str, article_type: str, text: str) -> str:
    lower = text.lower()
    company = company_name(symbol).lower()
    symbol_lower = symbol.lower()

    if symbol_lower in lower or company in lower:
        return "ticker"
    if article_type in {"macro", "geopolitics"}:
        return "macro"
    if article_type in {"analyst", "pricing", "product"}:
        return "sector"
    return "indirect"


def _importance(article_type: str, relevance: str, source: str) -> str:
    score = 0

    if article_type in {"earnings", "macro", "regulatory", "pricing"}:
        score += 2
    if relevance == "high":
        score += 2
    elif relevance == "medium":
        score += 1
    score += 1 if _source_score(source) >= 4 else 0

    if score >= 4:
        return "high"
    if score >= 2:
        return "medium"
    return "low"


def _time_horizon(article_type: str) -> str:
    if article_type in {"earnings", "macro", "analyst"}:
        return "short_term"
    if article_type in {"regulatory", "pricing"}:
        return "swing"
    if article_type in {"product"}:
        return "medium_term"
    return "short_term"


def _key_takeaway(symbol: str, article_type: str, direction: str, relevance: str) -> str:
    if article_type == "earnings":
        if direction == "bullish":
            return f"{symbol} has an earnings-related catalyst that may support upside if the market likes the results and guidance."
        if direction == "bearish":
            return f"{symbol} has an earnings-related catalyst that could pressure price if traders focus on weaker guidance or margins."
        return f"{symbol} has an earnings-related headline, but the directional read is not strong enough yet."

    if article_type == "macro":
        return f"This macro headline matters because broader market tone and rates expectations can influence {symbol} in the near term."

    if article_type == "analyst":
        return f"Analyst commentary can move short-term sentiment, but price confirmation matters more than the headline alone."

    if article_type == "regulatory":
        return f"Regulatory headlines matter because they increase uncertainty and can weaken conviction until more detail comes out."

    if article_type == "pricing":
        return f"Pricing-related headlines matter because they can change expectations around demand, margins, and competition."

    if relevance == "high":
        return f"This headline appears relevant to {symbol}, but it still needs price confirmation before it becomes a strong trading input."

    return "This headline adds context, but it is not strong enough by itself to define the trade thesis."


def _trade_relevance(symbol: str, article_type: str, direction: str, market_scope: str) -> str:
    if article_type == "macro" and symbol in ETF_MACRO_SYMBOLS:
        if direction == "bullish":
            return f"Useful for index traders if {symbol} strengthens with breadth and holds early support after the headline."
        if direction == "bearish":
            return f"Useful for index traders if {symbol} fails to hold rebounds and sellers stay in control after the headline."
        return f"Relevant for index traders, but this needs confirmation from broad market price action before acting on it."

    if direction == "bullish":
        return f"Most useful if {symbol} starts attracting buyers above nearby resistance instead of fading the headline."
    if direction == "bearish":
        return f"Most useful if {symbol} cannot reclaim resistance and sellers keep control on retests."
    if market_scope == "ticker":
        return f"Relevant mainly as supporting context; the trade should still be driven by whether {symbol} confirms the story on price."
    return "This is context, not a standalone trade signal. Let price action decide whether it becomes actionable."


def _confirmation(direction: str, article_type: str, symbol: str, market_scope: str) -> str | None:
    if direction == "bullish":
        if article_type == "earnings":
            return f"Confirmation improves if {symbol} holds the post-headline move and continues above nearby resistance with volume."
        if market_scope == "macro":
            return f"Confirmation improves if the market absorbs the headline well and {symbol} participates with broad strength."
        return f"Confirmation improves if buyers defend pullbacks and the stock keeps making higher intraday lows."

    if direction == "bearish":
        if article_type in {"macro", "geopolitics"} and symbol in ETF_MACRO_SYMBOLS:
            return f"Confirmation improves if sellers stay in control on rebounds and {symbol} continues failing near resistance."
        return f"Confirmation improves if the stock cannot reclaim key levels and downside follow-through appears on bounces."

    return None


def _invalidation(direction: str, article_type: str, symbol: str, market_scope: str) -> str | None:
    if direction == "bullish":
        return f"The bullish read weakens if {symbol} cannot hold the headline reaction and quickly slips back below support."

    if direction == "bearish":
        if article_type == "macro" and symbol in ETF_MACRO_SYMBOLS:
            return f"The bearish read weakens if the market shrugs off the headline and {symbol} reclaims resistance with improving breadth."
        return f"The bearish read weakens if sellers lose control and {symbol} reclaims levels that the headline initially pushed it below."

    return None


def _article_score(symbol: str, article: dict) -> int:
    text = _text(article)
    source = _normalize_source(article)
    article_type = _detect_article_type(text)
    relevance = _relevance_for_symbol(symbol, article_type, text)
    direction = _detect_direction(text)

    score = 0
    score += _source_score(source) * 2

    if relevance == "high":
        score += 8
    elif relevance == "medium":
        score += 4

    if article_type in {"earnings", "macro", "regulatory", "pricing"}:
        score += 5
    elif article_type in {"analyst", "product"}:
        score += 3

    if direction in {"bullish", "bearish"}:
        score += 2

    if article.get("publishedAt"):
        score += 1

    return score


def _rank_articles(symbol: str, articles: list[dict]) -> list[dict]:
    return sorted(articles, key=lambda x: _article_score(symbol, x), reverse=True)


def _group_key(article: dict) -> str:
    title = _safe_text(article.get("title")).lower()
    title = re.sub(r"[^a-z0-9\s]", " ", title)
    title = re.sub(r"\s+", " ", title).strip()
    words = title.split()[:8]
    return " ".join(words)


def _dedupe_similar(articles: list[dict]) -> list[dict]:
    seen = set()
    output = []

    for article in articles:
        key = _group_key(article)
        if key in seen:
            continue
        seen.add(key)
        output.append(article)

    return output


def _to_interpreted(symbol: str, article: dict) -> InterpretedArticle:
    text = _text(article)
    source = _normalize_source(article)

    article_type = _detect_article_type(text)
    direction = _detect_direction(text)
    relevance = _relevance_for_symbol(symbol, article_type, text)
    market_scope = _market_scope(symbol, article_type, text)
    importance = _importance(article_type, relevance, source)
    time_horizon = _time_horizon(article_type)

    return InterpretedArticle(
        title=_safe_text(article.get("title")) or "Untitled article",
        source=source,
        published_at=_safe_text(article.get("publishedAt")) or None,
        url=_safe_text(article.get("url")) or None,
        article_type=article_type,
        relevance=relevance,
        direction=direction,
        impact=importance,
        explanation=_key_takeaway(symbol, article_type, direction, relevance),
        mentioned_tickers=_extract_tickers(text),
        importance=importance,
        time_horizon=time_horizon,
        market_scope=market_scope,
        key_takeaway=_key_takeaway(symbol, article_type, direction, relevance),
        trade_relevance=_trade_relevance(symbol, article_type, direction, market_scope),
        confirmation_to_watch=_confirmation(direction, article_type, symbol, market_scope),
        invalidation_to_watch=_invalidation(direction, article_type, symbol, market_scope),
        impact_area=[],
    )


def get_symbol_news_bundle(symbol: str) -> dict:
    symbol = symbol.upper().strip()

    raw_ticker: list[dict] = []
    raw_macro: list[dict] = []

    try:
        raw_ticker = _dedupe_articles(fetch_ticker_news(symbol))
    except Exception:
        raw_ticker = []

    try:
        raw_macro = _dedupe_articles(fetch_macro_news(category="general"))
    except Exception:
        raw_macro = []

    if len(raw_ticker) < 2 and settings.enable_scrape_fallback:
        try:
            raw_ticker = _dedupe_articles(
                raw_ticker + fetch_ticker_fallback_news(
                    symbol=symbol,
                    company_name=company_name(symbol),
                    limit=4,
                )
            )
        except Exception:
            pass

    if len(raw_macro) < 1 and settings.enable_scrape_fallback:
        try:
            raw_macro = _dedupe_articles(raw_macro + fetch_macro_fallback_news(limit=3))
        except Exception:
            pass

    ranked_ticker = _dedupe_similar(_rank_articles(symbol, raw_ticker))[:3]
    ranked_macro = _dedupe_similar(_rank_articles(symbol, raw_macro))[:2]

    ticker_news = [_to_interpreted(symbol, x) for x in ranked_ticker]
    macro_news = [_to_interpreted(symbol, x) for x in ranked_macro]

    return {
        "ticker_news": ticker_news[:3],
        "macro_news": macro_news[:2],
    }