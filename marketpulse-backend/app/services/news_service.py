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
    "financial times": 5,
    "the economist": 4,
    "associated press": 4,
    "barrons": 4,
    "cnbc": 4,
    "marketwatch": 3,
    "yahoo": 2,
    "google news rss": 2,
    "finnhub": 2,
}
BLOCKED_SOURCES = {"seeking alpha"}

ARTICLE_TYPE_KEYWORDS = {
    "earnings": ["earnings", "eps", "revenue", "guidance", "outlook"],
    "analyst": ["analyst", "upgrade", "downgrade", "price target"],
    "macro": ["fed", "federal reserve", "fomc", "inflation", "cpi", "ppi", "rates", "treasury"],
    "regulatory": ["sec", "lawsuit", "doj", "investigation", "probe"],
    "product": ["launch", "product", "release", "partnership", "deal", "contract"],
    "geopolitics": ["iran", "oil", "middle east", "war", "sanction", "attack"],
    "pricing": ["price cut", "pricing", "discount", "margin pressure"],
}

EVENT_SIGNALS = {
    "guidance_raise": {
        "keywords": ["raises guidance", "guidance raised", "raises outlook", "increased outlook"],
        "takeaway": "Management is signaling better forward demand than the market was pricing.",
        "trade_relevance": "Best used for continuation setups if price accepts above the post-news range high.",
        "confirmation": "Upside thesis is stronger if follow-through holds beyond the opening reaction range instead of immediately mean-reverting.",
        "invalidation": "Thesis weakens quickly if the post-news gap is filled and the stock loses the reaction-day low.",
    },
    "guidance_cut": {
        "keywords": ["cuts guidance", "guidance cut", "lowers outlook", "withdraws guidance"],
        "takeaway": "Forward expectations were reset lower, so valuation multiples can compress until estimates stabilize.",
        "trade_relevance": "Most actionable as downside continuation or failed-bounce setups rather than first-candle chasing.",
        "confirmation": "Bearish thesis strengthens if bounces fail near the first post-news supply zone.",
        "invalidation": "Thesis is weaker if the stock reclaims and holds above the initial breakdown level.",
    },
    "cpi_cooling": {
        "keywords": ["cpi cooled", "inflation cooled", "lower than expected cpi", "soft inflation"],
        "takeaway": "Cooling inflation can reduce rate-pressure and typically helps duration-sensitive growth assets.",
        "trade_relevance": "Most useful for index/sector rotation decisions, especially growth vs. defensives.",
        "confirmation": "Signal is stronger if Treasury yields fade while growth-heavy indices outperform value intraday.",
        "invalidation": "Signal is weaker if yields rise anyway and growth leadership fails to appear.",
    },
    "cpi_hot": {
        "keywords": ["hotter than expected cpi", "inflation accelerated", "cpi rose", "sticky inflation"],
        "takeaway": "Hot inflation can push rate expectations higher and pressure risk-asset multiples.",
        "trade_relevance": "Useful for risk-off planning, especially in high-multiple tech and broad index exposure.",
        "confirmation": "Signal is stronger if yields rise and high-beta sectors underperform on rebounds.",
        "invalidation": "Signal weakens if yields fade and risk assets reclaim pre-release levels.",
    },
    "analyst_upgrade": {
        "keywords": ["upgrade", "raised price target", "overweight", "buy rating"],
        "takeaway": "Sell-side sentiment improved, which can drive short-term flows and repositioning.",
        "trade_relevance": "Higher quality when the call is echoed by multiple desks, not a one-off mention.",
        "confirmation": "More credible if the stock outperforms peers for a full session after the note.",
        "invalidation": "Less credible if relative strength fades by the close despite the upgrade headline.",
    },
    "analyst_downgrade": {
        "keywords": ["downgrade", "cut price target", "underweight", "sell rating"],
        "takeaway": "Street sentiment worsened, which can keep buyers cautious near resistance.",
        "trade_relevance": "Works best as context for fade setups when risk appetite is already weak.",
        "confirmation": "More credible if the stock underperforms peers and fails on rebound attempts.",
        "invalidation": "Less credible if the stock absorbs the downgrade and closes back above pre-note levels.",
    },
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
        source_name = _normalize_source(article).lower()
        if any(blocked in source_name for blocked in BLOCKED_SOURCES):
            continue

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


def _detect_event_signal(text: str) -> str | None:
    lower = text.lower()
    for signal_name, signal in EVENT_SIGNALS.items():
        if any(keyword in lower for keyword in signal["keywords"]):
            return signal_name
    return None


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


def _fallback_takeaway(symbol: str, article_type: str, direction: str, relevance: str) -> str:
    if article_type == "earnings":
        if direction == "bullish":
            return f"{symbol} has an earnings catalyst that can support upside if estimate revisions keep moving higher over the next sessions."
        if direction == "bearish":
            return f"{symbol} has an earnings catalyst that can pressure price if estimate cuts or margin concerns continue."
        return f"{symbol} has an earnings headline, but directional conviction is still mixed."

    if article_type == "macro":
        return f"This macro headline can reprice rates and risk appetite, which often drives near-term movement in {symbol}."

    if article_type == "analyst":
        return "Analyst commentary matters most when it aligns with broader sector positioning and relative strength."

    if article_type == "regulatory":
        return "Regulatory risk can keep positioning defensive until legal or policy details become clearer."

    if article_type == "pricing":
        return "Pricing headlines can shift margin and demand assumptions quickly, especially in competitive categories."

    if relevance == "high":
        return f"This headline is symbol-relevant for {symbol}, but it still needs market follow-through to become a high-conviction setup."

    return "This adds context to the tape but is not strong enough on its own to define positioning."


def _fallback_trade_relevance(symbol: str, article_type: str, direction: str, market_scope: str) -> str:
    if article_type == "macro" and symbol in ETF_MACRO_SYMBOLS:
        if direction == "bullish":
            return f"Actionable for index traders if {symbol} leads intraday and risk-on sectors keep relative strength."
        if direction == "bearish":
            return f"Actionable for index traders if {symbol} remains offered and defensives outperform."
        return f"Relevant for index traders, but requires clear sector/breadth confirmation before acting."

    if direction == "bullish":
        return f"Most useful when {symbol} shows persistent relative strength versus its sector peers after the headline."
    if direction == "bearish":
        return f"Most useful when {symbol} underperforms peers and fails to hold rebound attempts."
    if market_scope == "ticker":
        return f"Useful as supporting context while waiting for clearer directional acceptance in {symbol}."
    return "Use as background context rather than a direct trigger."


def _fallback_confirmation(direction: str, article_type: str, symbol: str) -> str | None:
    if direction == "bullish":
        if article_type == "earnings":
            return f"Confirmation improves if {symbol} holds above its first post-earnings balance area for a full session."
        return f"Confirmation improves if {symbol} keeps making higher lows after the headline window."

    if direction == "bearish":
        if article_type in {"macro", "geopolitics"} and symbol in ETF_MACRO_SYMBOLS:
            return f"Confirmation improves if rebound attempts in {symbol} fail while yields stay elevated."
        return f"Confirmation improves if {symbol} cannot reclaim the initial headline breakdown zone."

    return None


def _fallback_invalidation(direction: str, article_type: str, symbol: str) -> str | None:
    if direction == "bullish":
        return f"Bullish read weakens if {symbol} loses the reaction-day support zone and cannot reclaim it quickly."

    if direction == "bearish":
        if article_type == "macro" and symbol in ETF_MACRO_SYMBOLS:
            return f"Bearish read weakens if {symbol} recovers pre-headline levels while yields and credit spreads normalize."
        return f"Bearish read weakens if {symbol} recovers above the level that triggered the initial sell response."

    return None


def _context_pack(symbol: str, article_type: str, direction: str, relevance: str, market_scope: str, text: str) -> tuple[str, str, str | None, str | None]:
    signal_name = _detect_event_signal(text)
    if signal_name:
        signal = EVENT_SIGNALS[signal_name]
        return (
            signal["takeaway"],
            signal["trade_relevance"],
            signal["confirmation"],
            signal["invalidation"],
        )

    return (
        _fallback_takeaway(symbol, article_type, direction, relevance),
        _fallback_trade_relevance(symbol, article_type, direction, market_scope),
        _fallback_confirmation(direction, article_type, symbol),
        _fallback_invalidation(direction, article_type, symbol),
    )


def _sentence_chunks(text: str) -> list[str]:
    cleaned = re.sub(r"\s+", " ", text).strip()
    if not cleaned:
        return []
    pieces = re.split(r"(?<=[.!?])\s+", cleaned)
    return [piece.strip() for piece in pieces if piece.strip()]


def _professional_summary(text: str, fallback: str) -> str:
    chunks = _sentence_chunks(text)
    if not chunks:
        return fallback
    if len(chunks) == 1:
        return chunks[0]
    return f"{chunks[0]} {chunks[1]}"


def _eli5_summary(symbol: str, key_takeaway: str, trade_relevance: str) -> str:
    return (
        f"ELI5: Big money saw a story that might move {symbol}. "
        f"{key_takeaway} What traders do with it: {trade_relevance}"
    )


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

    if _detect_event_signal(text):
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

    key_takeaway, trade_relevance, confirmation_to_watch, invalidation_to_watch = _context_pack(
        symbol=symbol,
        article_type=article_type,
        direction=direction,
        relevance=relevance,
        market_scope=market_scope,
        text=text,
    )
    professional_takeaway = _professional_summary(text, key_takeaway)
    eli5_takeaway = _eli5_summary(symbol, key_takeaway, trade_relevance)

    return InterpretedArticle(
        title=_safe_text(article.get("title")) or "Untitled article",
        source=source,
        published_at=_safe_text(article.get("publishedAt")) or None,
        url=_safe_text(article.get("url")) or None,
        article_type=article_type,
        relevance=relevance,
        direction=direction,
        impact=importance,
        explanation=eli5_takeaway,
        mentioned_tickers=_extract_tickers(text),
        importance=importance,
        time_horizon=time_horizon,
        market_scope=market_scope,
        key_takeaway=professional_takeaway,
        trade_relevance=trade_relevance,
        confirmation_to_watch=confirmation_to_watch,
        invalidation_to_watch=invalidation_to_watch,
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
