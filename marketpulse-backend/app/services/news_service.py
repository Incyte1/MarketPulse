from __future__ import annotations

import re

from app.clients.finnhub_client import fetch_macro_news, fetch_ticker_news
from app.clients.scrape_fallback_client import (
    fetch_macro_fallback_news,
    fetch_ticker_fallback_news,
)
from app.core.config import settings
from app.models.ticker import InterpretedArticle, PriceContext, TechnicalContext
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
    "analyst": ["analyst", "upgrade", "downgrade", "price target", "rating"],
    "macro": ["fed", "federal reserve", "fomc", "inflation", "cpi", "ppi", "pce", "rates", "treasury", "yield", "jobs report"],
    "geopolitics": ["hormuz", "middle east", "war", "sanction", "attack", "shipping", "oil supply", "ceasefire"],
    "regulatory": ["sec", "lawsuit", "doj", "investigation", "probe", "regulator", "antitrust"],
    "sector": ["sector", "etf", "leadership", "breadth", "rotation", "cybersecurity", "fintech", "banks", "semiconductor"],
    "product": ["launch", "product", "release", "partnership", "deal", "contract"],
    "pricing": ["price cut", "pricing", "discount", "margin pressure"],
}

THEME_KEYWORDS = {
    "rates": ["fed", "rates", "treasury", "yield", "bond", "fomc"],
    "inflation": ["inflation", "cpi", "ppi", "pce", "prices"],
    "energy": ["oil", "crude", "gas", "energy", "opec"],
    "shipping": ["shipping", "hormuz", "freight", "tankers", "logistics"],
    "consumer": ["consumer", "retail", "spending", "wages", "jobs"],
    "sector_rotation": ["sector", "etf", "breadth", "rotation", "leadership", "semis", "cybersecurity", "fintech"],
    "credit": ["bank", "banks", "credit", "loan", "default", "financial"],
    "regulation": ["regulator", "lawsuit", "probe", "antitrust", "doj", "sec"],
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
        "trade_relevance": "Most useful for index and sector rotation decisions, especially growth versus defensives.",
        "confirmation": "Signal is stronger if Treasury yields fade while growth-heavy indices outperform value intraday.",
        "invalidation": "Signal is weaker if yields rise anyway and growth leadership fails to appear.",
    },
    "cpi_hot": {
        "keywords": ["hotter than expected cpi", "inflation accelerated", "sticky inflation", "higher than expected inflation"],
        "takeaway": "Hot inflation can push rate expectations higher and pressure risk-asset multiples.",
        "trade_relevance": "Useful for risk-off planning, especially in high-multiple tech and broad index exposure.",
        "confirmation": "Signal is stronger if yields rise and high-beta sectors underperform on rebounds.",
        "invalidation": "Signal weakens if yields fade and risk assets reclaim pre-release levels.",
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
SHORT_TERM_INTERVALS = {"1min", "5min", "15min", "1h", "1day"}

GENERIC_TEXT_MARKERS = (
    "no grounded",
    "this adds context to the tape",
    "not giving a strong edge",
    "use as background context",
    "useful as supporting context",
    "relevant for index traders, but requires clear sector/breadth confirmation before acting",
)


def _safe_text(value) -> str:
    return (str(value).strip() if value is not None else "")


def _normalize_source(article: dict) -> str:
    source = article.get("source") or {}
    if isinstance(source, dict):
        return _safe_text(source.get("name")) or "Unknown"
    if isinstance(source, str):
        return _safe_text(source) or "Unknown"
    return "Unknown"


def _is_blocked_source_name(source: str | None) -> bool:
    normalized = _safe_text(source).lower()
    compact = re.sub(r"[^a-z0-9]+", "", normalized)
    return any(
        blocked in normalized or re.sub(r"[^a-z0-9]+", "", blocked) in compact
        for blocked in BLOCKED_SOURCES
    )


def _normalize_fragment(value: str) -> str:
    return re.sub(r"\s+", " ", value).strip()


def _comparison_key(value: str) -> str:
    return re.sub(r"[^a-z0-9]+", " ", value.lower()).strip()


def _clean_fragments(article: dict) -> list[str]:
    raw_parts = [
        _safe_text(article.get("title")),
        _safe_text(article.get("description")),
        _safe_text(article.get("content")),
    ]

    cleaned: list[str] = []
    seen: set[str] = set()

    for part in raw_parts:
        normalized = _normalize_fragment(part)
        compare_key = _comparison_key(normalized)
        if not normalized or compare_key in seen:
            continue

        if cleaned:
            first_key = _comparison_key(cleaned[0])
            if compare_key in first_key or first_key in compare_key:
                continue

        if compare_key in {"reuters", "yahoo", "bloomberg"}:
            continue

        seen.add(compare_key)
        cleaned.append(normalized)

    return cleaned


def _text(article: dict) -> str:
    return " ".join(_clean_fragments(article)).strip()


def _dedupe_articles(raw_articles: list[dict]) -> list[dict]:
    seen = set()
    output = []

    for article in raw_articles:
        source_name = _normalize_source(article).lower()
        if _is_blocked_source_name(source_name):
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
    found = [value for value in matches if value in KNOWN_TICKERS]
    return list(dict.fromkeys(found))


def _detect_article_type(text: str) -> str:
    lower = text.lower()
    for article_type, words in ARTICLE_TYPE_KEYWORDS.items():
        if any(word in lower for word in words):
            return article_type
    return "general"


def _detect_themes(text: str) -> list[str]:
    lower = text.lower()
    themes = [
        theme
        for theme, words in THEME_KEYWORDS.items()
        if any(word in lower for word in words)
    ]
    return themes[:3]


def _detect_event_signal(text: str) -> str | None:
    lower = text.lower()
    for signal_name, signal in EVENT_SIGNALS.items():
        if any(keyword in lower for keyword in signal["keywords"]):
            return signal_name
    return None


def _detect_direction(text: str) -> str:
    lower = text.lower()
    pos = sum(1 for value in POSITIVE_TERMS if value in lower)
    neg = sum(1 for value in NEGATIVE_TERMS if value in lower)

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

    if symbol in ETF_MACRO_SYMBOLS and article_type in {"macro", "geopolitics", "sector"}:
        return "high"

    if article_type in {"macro", "geopolitics", "regulatory", "sector"}:
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
    if article_type in {"sector", "analyst", "pricing", "product"}:
        return "sector"
    return "indirect"


def _importance(article_type: str, relevance: str, source: str) -> str:
    score = 0

    if article_type in {"earnings", "macro", "regulatory", "pricing", "geopolitics"}:
        score += 2
    if relevance == "high":
        score += 2
    elif relevance == "medium":
        score += 1
    if _source_score(source) >= 4:
        score += 1

    if score >= 4:
        return "high"
    if score >= 2:
        return "medium"
    return "low"


def _time_horizon(article_type: str) -> str:
    if article_type in {"earnings", "macro", "analyst", "sector"}:
        return "short_term"
    if article_type in {"regulatory", "pricing", "product"}:
        return "long_term"
    return "short_term"


def _theme_takeaway(symbol: str, article_type: str, direction: str, themes: list[str], relevance: str) -> str:
    if "rates" in themes or "inflation" in themes:
        if direction == "bearish":
            return f"This headline can push yields higher and compress valuation multiples, which matters quickly for {symbol}."
        if direction == "bullish":
            return f"This headline can ease rate pressure and support risk appetite, which is constructive for {symbol}."
        return f"This headline matters because rate expectations often drive short-term movement in {symbol}."

    if "energy" in themes or "shipping" in themes:
        return f"Shipping or energy disruption can move oil, inflation expectations, and broad risk appetite around {symbol}."

    if "sector_rotation" in themes:
        return f"This story is more about leadership and breadth than a direct company event, so it matters for {symbol} only if the move spreads across sectors."

    if "credit" in themes:
        return f"Credit and banking headlines can tighten or loosen market risk appetite, which feeds through to {symbol}."

    if article_type == "earnings":
        if direction == "bullish":
            return f"{symbol} has an earnings catalyst that can support upside if estimate revisions keep moving higher over the next sessions."
        if direction == "bearish":
            return f"{symbol} has an earnings catalyst that can pressure price if estimate cuts or margin concerns continue."
        return f"{symbol} has an earnings headline, but directional conviction is still mixed."

    if article_type == "macro":
        return f"This macro headline can reprice rates and risk appetite, which often drives near-term movement in {symbol}."

    if article_type == "sector":
        return f"This sector story matters most if leadership rotates strongly enough to pull {symbol} with it."

    if article_type == "regulatory":
        return "Regulatory risk can keep positioning defensive until policy details become clearer."

    if relevance == "high":
        return f"This headline is relevant for {symbol}, but it still needs market follow-through to become a high-conviction setup."

    return "This adds context to the tape but is not strong enough on its own to define positioning."


def _theme_trade_relevance(symbol: str, direction: str, themes: list[str], market_scope: str) -> str:
    if "rates" in themes or "inflation" in themes:
        return f"Most actionable if Treasury yields and growth-versus-defensive breadth confirm the move in {symbol}."

    if "energy" in themes or "shipping" in themes:
        return f"Use it for index planning only if oil, transports, and broad equity breadth move in the same direction as {symbol}."

    if "sector_rotation" in themes:
        return f"Useful only if sector leadership broadens enough to change breadth under the surface of {symbol}."

    if direction == "bullish":
        return f"Most useful when {symbol} shows persistent relative strength after the headline instead of a one-candle pop."
    if direction == "bearish":
        return f"Most useful when {symbol} underperforms peers and fails to hold rebound attempts."
    if market_scope == "ticker":
        return f"Useful as supporting context while waiting for a cleaner directional acceptance in {symbol}."
    return "Use as background context rather than a direct trigger."


def _theme_confirmation(direction: str, themes: list[str], symbol: str) -> str | None:
    if direction == "bullish":
        if "rates" in themes or "inflation" in themes:
            return f"Confirmation improves if yields fade while {symbol} holds above the initial reaction range."
        if "sector_rotation" in themes:
            return f"Confirmation improves if breadth broadens and {symbol} keeps making higher lows."
        return f"Confirmation improves if {symbol} keeps building above the initial headline reaction zone."

    if direction == "bearish":
        if "energy" in themes or "shipping" in themes:
            return f"Confirmation improves if risk assets stay heavy while energy-sensitive headlines keep pressure on sentiment around {symbol}."
        return f"Confirmation improves if rebound attempts in {symbol} fail near the first supply zone after the headline."

    return f"Confirmation only improves if {symbol} resolves decisively instead of chopping around the headline."


def _theme_invalidation(direction: str, themes: list[str], symbol: str) -> str | None:
    if direction == "bullish":
        return f"Bullish read weakens if {symbol} quickly loses the reaction low and cannot reclaim it."

    if direction == "bearish":
        if "rates" in themes or "inflation" in themes:
            return f"Bearish read weakens if yields fade and {symbol} reclaims pre-headline levels."
        return f"Bearish read weakens if {symbol} absorbs the news and reclaims the breakdown zone."

    return f"Neutral read is invalidated if {symbol} resolves cleanly away from the current headline range."


def _context_pack(
    symbol: str,
    article_type: str,
    direction: str,
    relevance: str,
    market_scope: str,
    text: str,
    themes: list[str],
) -> tuple[str, str, str | None, str | None]:
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
        _theme_takeaway(symbol, article_type, direction, themes, relevance),
        _theme_trade_relevance(symbol, direction, themes, market_scope),
        _theme_confirmation(direction, themes, symbol),
        _theme_invalidation(direction, themes, symbol),
    )


def _sentence_chunks(text: str) -> list[str]:
    cleaned = re.sub(r"\s+", " ", text).strip()
    if not cleaned:
        return []
    pieces = re.split(r"(?<=[.!?])\s+", cleaned)
    unique: list[str] = []
    seen: set[str] = set()

    for piece in pieces:
        normalized = re.sub(r"[^a-z0-9]+", " ", piece.lower()).strip()
        if not normalized or normalized in seen:
            continue
        seen.add(normalized)
        unique.append(piece.strip())

    return unique


def _professional_summary(article: dict, fallback: str) -> str:
    fragments = _clean_fragments(article)
    title = fragments[0] if fragments else fallback
    detail = fragments[1] if len(fragments) > 1 else ""
    detail_sentences = _sentence_chunks(detail)

    if detail_sentences:
        detail_sentence = detail_sentences[0]
        if _comparison_key(detail_sentence) != _comparison_key(title):
            return f"{title}. {detail_sentence}"

    return title or fallback


def _eli5_summary(
    symbol: str,
    article_type: str,
    direction: str,
    key_takeaway: str,
    trade_relevance: str,
    confirmation_to_watch: str | None,
    invalidation_to_watch: str | None,
    themes: list[str],
) -> str:
    if article_type in {"macro", "geopolitics"}:
        opener = "Simple version: this is a market-wide story, not a company-only story."
    elif article_type == "sector":
        opener = "Simple version: this is a sector leadership story."
    elif article_type == "earnings":
        opener = "Simple version: this is a company result story."
    else:
        opener = "Simple version: this is a market story that can change trader behavior."

    if direction == "bullish":
        tilt = "Right now it slightly helps buyers more than sellers."
    elif direction == "bearish":
        tilt = "Right now it helps sellers more than buyers."
    else:
        tilt = "Right now it is mostly context until price confirms it."

    theme_hint = ""
    if "rates" in themes or "inflation" in themes:
        theme_hint = f" For {symbol}, the big thing to watch is whether yields move with the story."
    elif "energy" in themes or "shipping" in themes:
        theme_hint = f" For {symbol}, the big thing to watch is whether oil and risk appetite move together."
    elif "sector_rotation" in themes:
        theme_hint = f" For {symbol}, the big thing to watch is whether leadership broadens across sectors."

    watch_next = confirmation_to_watch or invalidation_to_watch or trade_relevance
    return f"{opener} {tilt} {key_takeaway} {trade_relevance} Next clue: {watch_next}.{theme_hint}".strip()


def _as_interpreted_article(article: InterpretedArticle | dict) -> InterpretedArticle:
    if isinstance(article, InterpretedArticle):
        return article
    return InterpretedArticle(**article)


def sanitize_interpreted_articles(
    articles: list[InterpretedArticle | dict],
) -> list[InterpretedArticle]:
    sanitized: list[InterpretedArticle] = []
    for item in articles:
        article = _as_interpreted_article(item)
        if _is_blocked_source_name(article.source):
            continue
        sanitized.append(article)
    return sanitized


def _score_for_interval(article: InterpretedArticle, interval: str, bucket: str) -> int:
    target_horizon = "short_term" if interval in SHORT_TERM_INTERVALS else "long_term"
    horizon = (article.time_horizon or "short_term").lower()
    importance = (article.importance or article.impact or "medium").lower()
    relevance = (article.relevance or "low").lower()
    direction = (article.direction or "neutral").lower()
    article_type = (article.article_type or "general").lower()
    market_scope = (article.market_scope or "indirect").lower()
    themes = {value.lower() for value in (article.impact_area or [])}

    horizon_score = {
        "short_term": {"short_term": 6, "long_term": 2},
        "long_term": {"long_term": 6, "short_term": 2},
    }[target_horizon].get(horizon, 1)

    importance_score = {"high": 4, "medium": 2, "low": 1}.get(importance, 1)
    relevance_score = {"high": 4, "medium": 2, "low": 1}.get(relevance, 1)
    direction_score = 1 if direction in {"bullish", "bearish"} else 0

    bucket_score = 0
    if bucket == "ticker" and market_scope in {"ticker", "sector"}:
        bucket_score += 2
    if bucket == "macro" and (
        article_type in {"macro", "geopolitics", "regulatory"}
        or market_scope == "macro"
        or bool(themes.intersection({"rates", "inflation", "energy", "shipping", "credit"}))
    ):
        bucket_score += 3

    return horizon_score + importance_score + relevance_score + direction_score + bucket_score


def _valid_macro_driver(article: InterpretedArticle) -> bool:
    article_type = (article.article_type or "general").lower()
    market_scope = (article.market_scope or "indirect").lower()
    themes = {value.lower() for value in (article.impact_area or [])}

    if article_type in {"macro", "geopolitics", "regulatory"}:
        return True
    if market_scope == "macro":
        return True
    if themes.intersection({"rates", "inflation", "energy", "shipping", "credit", "consumer"}):
        return True
    return False


def filter_news_bundle_for_interval(news_bundle: dict, interval: str) -> dict:
    ticker_news = sanitize_interpreted_articles(news_bundle.get("ticker_news", []))
    macro_news = sanitize_interpreted_articles(news_bundle.get("macro_news", []))

    ranked_ticker = sorted(
        ticker_news,
        key=lambda item: _score_for_interval(item, interval, "ticker"),
        reverse=True,
    )
    ranked_macro = sorted(
        [item for item in macro_news if _valid_macro_driver(item)],
        key=lambda item: _score_for_interval(item, interval, "macro"),
        reverse=True,
    )

    return {
        "ticker_news": ranked_ticker[:3],
        "macro_news": ranked_macro[:3],
    }


def _article_score(symbol: str, article: dict) -> int:
    text = _text(article)
    source = _normalize_source(article)
    article_type = _detect_article_type(text)
    relevance = _relevance_for_symbol(symbol, article_type, text)
    direction = _detect_direction(text)
    themes = _detect_themes(text)

    score = 0
    score += _source_score(source) * 2

    if relevance == "high":
        score += 8
    elif relevance == "medium":
        score += 4

    if article_type in {"earnings", "macro", "regulatory", "pricing", "geopolitics"}:
        score += 5
    elif article_type in {"analyst", "product", "sector"}:
        score += 3

    if direction in {"bullish", "bearish"}:
        score += 2

    if _detect_event_signal(text):
        score += 2

    if {"rates", "inflation", "energy", "shipping", "credit"}.intersection(themes):
        score += 2

    if article.get("publishedAt"):
        score += 1

    return score


def _rank_articles(symbol: str, articles: list[dict]) -> list[dict]:
    return sorted(articles, key=lambda item: _article_score(symbol, item), reverse=True)


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
    themes = _detect_themes(text)

    key_takeaway, trade_relevance, confirmation_to_watch, invalidation_to_watch = _context_pack(
        symbol=symbol,
        article_type=article_type,
        direction=direction,
        relevance=relevance,
        market_scope=market_scope,
        text=text,
        themes=themes,
    )

    professional_takeaway = _professional_summary(article, key_takeaway)
    eli5_takeaway = _eli5_summary(
        symbol=symbol,
        article_type=article_type,
        direction=direction,
        key_takeaway=key_takeaway,
        trade_relevance=trade_relevance,
        confirmation_to_watch=confirmation_to_watch,
        invalidation_to_watch=invalidation_to_watch,
        themes=themes,
    )

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
        impact_area=themes,
    )


def _needs_upgrade(value: str | None) -> bool:
    lower = (value or "").lower()
    if not lower.strip():
        return True
    return any(marker in lower for marker in GENERIC_TEXT_MARKERS)


def _price_watch_label(interval: str) -> str:
    return "hourly close" if interval in SHORT_TERM_INTERVALS else "daily close"


def _price_watch_basis(interval: str) -> str:
    return "hourly-closing basis" if interval in SHORT_TERM_INTERVALS else "daily-closing basis"


def _price_watch_article(interval: str) -> str:
    return "an" if interval in SHORT_TERM_INTERVALS else "a"


def _market_context_confirmation(
    symbol: str,
    article: InterpretedArticle,
    technical_context: TechnicalContext,
    interval: str,
) -> str:
    close_type = _price_watch_label(interval)
    close_basis = _price_watch_basis(interval)
    close_article = _price_watch_article(interval)
    support = technical_context.support_level
    resistance = technical_context.resistance_level
    fast_label = technical_context.fast_indicator_label or "fast trend line"
    fast_level = technical_context.ema_20

    if article.direction == "bullish":
        return (
            f"Best confirmation is {close_article} {close_type} above {resistance:.2f} or continued holds above "
            f"{fast_label} near {fast_level:.2f}."
        )

    if article.direction == "bearish":
        return (
            f"Best confirmation is failed bounces below {resistance:.2f} followed by a break under "
            f"{support:.2f} support on an {close_basis}."
        )

    return f"Treat it as real only if {symbol} resolves outside the {support:.2f} to {resistance:.2f} range on a {close_basis}."


def _market_context_invalidation(
    symbol: str,
    article: InterpretedArticle,
    technical_context: TechnicalContext,
    interval: str,
) -> str:
    close_type = _price_watch_label(interval)
    close_basis = _price_watch_basis(interval)
    support = technical_context.support_level
    resistance = technical_context.resistance_level
    medium_label = technical_context.medium_indicator_label or "medium trend line"
    medium_level = technical_context.ema_50

    if article.direction == "bullish":
        return (
            f"Invalidate the bullish read if {symbol} loses {support:.2f} support or falls back below "
            f"{medium_label} near {medium_level:.2f} on a {close_basis}."
        )

    if article.direction == "bearish":
        return (
            f"Invalidate the bearish read if {symbol} reclaims {resistance:.2f} and starts holding above "
            f"{medium_label} near {medium_level:.2f} on a {close_basis}."
        )

    return f"The neutral read is invalid if {symbol} decisively leaves the {support:.2f} to {resistance:.2f} range."


def _contextual_trade_relevance(
    symbol: str,
    article: InterpretedArticle,
    technical_context: TechnicalContext,
) -> str:
    range_position = technical_context.range_position_percent
    vwap = technical_context.vwap

    if article.direction == "bullish":
        return (
            f"Most useful if {symbol} keeps trading above VWAP near {vwap:.2f} and starts building in the upper "
            f"{range_position:.0f}% of the active range."
        )

    if article.direction == "bearish":
        return (
            f"Most useful if {symbol} cannot reclaim VWAP near {vwap:.2f} and continues to trade in the lower "
            f"{range_position:.0f}% of the active range."
        )

    return (
        f"Useful as background context only until {symbol} either accepts above {technical_context.resistance_level:.2f} "
        f"or breaks below {technical_context.support_level:.2f}."
    )


def _contextual_eli5(
    symbol: str,
    article: InterpretedArticle,
    technical_context: TechnicalContext,
    interval: str,
) -> str:
    close_type = "hourly" if interval in SHORT_TERM_INTERVALS else "daily"
    support = technical_context.support_level
    resistance = technical_context.resistance_level
    regime = technical_context.regime_state.replace("_", " ")

    if article.article_type in {"macro", "geopolitics"}:
        opener = "Simple version: this is a big market story that can move the whole tape, not just one stock."
    elif article.article_type == "sector":
        opener = "Simple version: this is about which part of the market is leading right now."
    else:
        opener = "Simple version: this is a direct story traders can react to."

    return (
        f"{opener} For {symbol}, it matters because {article.key_takeaway or 'it can shift trader behavior'}. "
        f"Right now the chart is in a {regime} regime. Traders should watch {close_type} closes around "
        f"{support:.2f} support and {resistance:.2f} resistance next."
    )


def _merge_context(base: str | None, market_text: str) -> str:
    if not base:
        return market_text

    base_clean = base.strip()
    if not base_clean:
        return market_text

    if market_text.lower() in base_clean.lower():
        return base_clean

    return f"{base_clean} Market check: {market_text}"


def enrich_news_bundle_with_market_context(
    symbol: str,
    price_context: PriceContext,
    technical_context: TechnicalContext,
    news_bundle: dict,
    interval: str,
) -> dict:
    def enrich(article: InterpretedArticle) -> InterpretedArticle:
        updated = article.model_dump()
        market_trade_relevance = _contextual_trade_relevance(symbol, article, technical_context)
        market_confirmation = _market_context_confirmation(symbol, article, technical_context, interval)
        market_invalidation = _market_context_invalidation(symbol, article, technical_context, interval)

        if _needs_upgrade(article.trade_relevance):
            updated["trade_relevance"] = market_trade_relevance
        else:
            updated["trade_relevance"] = _merge_context(article.trade_relevance, market_trade_relevance)

        if _needs_upgrade(article.confirmation_to_watch):
            updated["confirmation_to_watch"] = market_confirmation
        else:
            updated["confirmation_to_watch"] = _merge_context(article.confirmation_to_watch, market_confirmation)

        if _needs_upgrade(article.invalidation_to_watch):
            updated["invalidation_to_watch"] = market_invalidation
        else:
            updated["invalidation_to_watch"] = _merge_context(article.invalidation_to_watch, market_invalidation)

        updated["explanation"] = _contextual_eli5(symbol, article, technical_context, interval)

        if _needs_upgrade(article.key_takeaway):
            updated["key_takeaway"] = (
                f"{article.title}. Price is currently {technical_context.range_position_percent:.0f}% through the active "
                f"range with {price_context.current_price:.2f} as the latest traded reference."
            )

        return InterpretedArticle(**updated)

    return {
        "ticker_news": [enrich(item) for item in sanitize_interpreted_articles(news_bundle.get("ticker_news", []))],
        "macro_news": [enrich(item) for item in sanitize_interpreted_articles(news_bundle.get("macro_news", []))],
    }


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
            raw_macro = _dedupe_articles(raw_macro + fetch_macro_fallback_news(limit=4))
        except Exception:
            pass

    ranked_ticker = _dedupe_similar(_rank_articles(symbol, raw_ticker))[:4]
    ranked_macro = _dedupe_similar(_rank_articles(symbol, raw_macro))[:4]

    ticker_news = [_to_interpreted(symbol, item) for item in ranked_ticker]
    macro_news = [_to_interpreted(symbol, item) for item in ranked_macro]

    return {
        "ticker_news": ticker_news,
        "macro_news": macro_news,
    }
