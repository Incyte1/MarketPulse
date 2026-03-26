from __future__ import annotations

from app.models.ticker import (
    BiasInfo,
    PriceContext,
    ProfessionalAnalysis,
    TechnicalContext,
)
from app.utils.symbols import company_name

SHORT_TERM_INTERVALS = {"1min", "5min", "15min", "1h", "1day"}


def _is_short_term(interval: str) -> bool:
    return interval in SHORT_TERM_INTERVALS


def _level_labels(technical_context: TechnicalContext) -> tuple[str, str, str]:
    return (
        technical_context.fast_indicator_label or "fast trend line",
        technical_context.medium_indicator_label or "medium trend line",
        technical_context.slow_indicator_label or "slow trend line",
    )


def _lead_article(news_bundle: dict):
    ticker_news = news_bundle.get("ticker_news", [])
    macro_news = news_bundle.get("macro_news", [])

    if ticker_news:
        return ticker_news[0]
    if macro_news:
        return macro_news[0]
    return None


def _regime_from_context(
    bias: BiasInfo,
    technical_context: TechnicalContext,
) -> str:
    if bias.label.upper() == "BULLISH":
        if technical_context.trend_medium == "bullish":
            return "trend_following_uptrend"
        return "constructive_but_mixed"

    if bias.label.upper() == "BEARISH":
        if technical_context.trend_medium == "bearish":
            return "risk_off_trending"
        return "weak_but_not_fully_confirmed"

    return "mixed_or_rangebound"


def _primary_driver(
    bias: BiasInfo,
    technical_context: TechnicalContext,
    news_bundle: dict,
) -> str:
    ticker_news = news_bundle.get("ticker_news", [])
    macro_news = news_bundle.get("macro_news", [])

    if ticker_news:
        top = ticker_news[0]
        if getattr(top, "importance", "medium") == "high":
            return f"{top.article_type}_catalyst"

    if macro_news and bias.label.upper() in {"BULLISH", "BEARISH"}:
        return "macro_flow"

    if technical_context.trend_medium == "bearish":
        return "price_structure_and_trend"
    if technical_context.trend_medium == "bullish":
        return "price_structure_and_trend"

    return "mixed_inputs"


def _secondary_drivers(news_bundle: dict) -> list[str]:
    drivers = []

    for item in news_bundle.get("ticker_news", [])[:2]:
        article_type = getattr(item, "article_type", "general")
        if article_type not in drivers:
            drivers.append(article_type)

    for item in news_bundle.get("macro_news", [])[:1]:
        article_type = getattr(item, "article_type", "macro")
        if article_type not in drivers:
            drivers.append(article_type)

    return drivers[:3]


def _confirmation_lines(
    symbol: str,
    bias: BiasInfo,
    technical_context: TechnicalContext,
    interval: str,
) -> list[str]:
    lines = []
    fast_label, medium_label, slow_label = _level_labels(technical_context)
    short_term = _is_short_term(interval)

    if bias.label.upper() == "BULLISH":
        if technical_context.price_vs_20d == "above":
            lines.append(f"Price is holding above the {fast_label}")
        if technical_context.price_vs_50d == "above":
            lines.append(f"Price is holding above the {medium_label}")
        if not short_term and technical_context.price_vs_200d == "above":
            lines.append(f"Price is holding above the {slow_label}")
        if technical_context.trend_score >= 4:
            lines.append(f"Trend score is strong at {technical_context.trend_score}")
        if technical_context.momentum_score >= 2:
            lines.append(f"Momentum score is supportive at {technical_context.momentum_score}")
        if technical_context.range_position_percent >= 70:
            lines.append(
                f"Price is already trading in the upper {technical_context.range_position_percent:.0f}% of the active range"
            )

    elif bias.label.upper() == "BEARISH":
        if technical_context.price_vs_20d == "below":
            lines.append(f"Price is below the {fast_label}")
        if technical_context.price_vs_50d == "below":
            lines.append(f"Price is below the {medium_label}")
        if not short_term and technical_context.price_vs_200d == "below":
            lines.append(f"Price is below the {slow_label}")
        if technical_context.trend_score <= -4:
            lines.append(f"Trend score still favors sellers at {technical_context.trend_score}")
        if technical_context.momentum_score <= -2:
            lines.append(f"Momentum score still favors downside at {technical_context.momentum_score}")
        if technical_context.range_position_percent <= 30:
            lines.append(
                f"Price is trading in the lower {technical_context.range_position_percent:.0f}% of the active range"
            )

    if not lines:
        lines.append("The chart is not fully confirming one clean directional thesis yet")

    return lines[:3]


def _invalidation_lines(
    symbol: str,
    bias: BiasInfo,
    technical_context: TechnicalContext,
    interval: str,
) -> list[str]:
    lines = []
    fast_label, medium_label, slow_label = _level_labels(technical_context)
    short_term = _is_short_term(interval)

    if bias.label.upper() == "BULLISH":
        lines.append(
            f"A failed breakout or loss of {technical_context.support_level:.2f} support would weaken the bullish read"
        )
        if technical_context.price_vs_20d == "below":
            lines.append(f"Failure to reclaim the {fast_label} would reduce confidence")
        if not short_term and technical_context.price_vs_200d == "below":
            lines.append(f"Staying below the {slow_label} would keep the long-term thesis compromised")
        if technical_context.exhaustion_score < 0:
            lines.append("The setup is stretched enough that pullback risk has to be respected")

    elif bias.label.upper() == "BEARISH":
        lines.append(
            f"A strong reclaim above {technical_context.resistance_level:.2f} resistance would weaken the bearish read"
        )
        if technical_context.price_vs_20d == "below":
            lines.append(f"Sustained recovery back above the {fast_label} would reduce downside confidence")
        if technical_context.price_vs_50d == "below":
            lines.append(f"Recovery above the {medium_label} would materially weaken the bearish thesis")
        if not short_term and technical_context.price_vs_200d == "below":
            lines.append(f"Reclaiming the {slow_label} would challenge the longer-term bearish structure")
        if technical_context.exhaustion_score > 0:
            lines.append("The setup is oversold enough that squeeze risk needs to be respected")

    else:
        lines.append("A decisive break out of the current range would invalidate the neutral read")

    return lines[:3]


def _tactical_stance(symbol: str, bias: BiasInfo, technical_context: TechnicalContext, interval: str) -> str:
    short_term = _is_short_term(interval)

    if bias.label.upper() == "BULLISH":
        if short_term:
            return (
                f"Favor continuation setups and pullback holds while price stays above {technical_context.support_level:.2f} "
                f"and keeps accepting in the upper half of the active range."
            )
        return (
            f"Favor patient long exposure on dips while the weekly structure stays above {technical_context.support_level:.2f} "
            f"and the trend score remains positive."
        )

    if bias.label.upper() == "BEARISH":
        if short_term:
            return (
                f"Favor failed bounces and weak reclaims while price remains capped below {technical_context.resistance_level:.2f} "
                f"in the lower half of the active range."
            )
        return (
            f"Favor defensive positioning until price can reclaim {technical_context.resistance_level:.2f} "
            f"and the longer-term trend score improves."
        )

    if short_term:
        return "Stay selective and wait for a cleaner short-term trigger before pressing directional exposure."
    return "Stay patient and wait for a clearer weekly trend break before building a bigger directional thesis."


def _key_risks(symbol: str, bias: BiasInfo, technical_context: TechnicalContext, news_bundle: dict, interval: str) -> list[str]:
    risks = []
    short_term = _is_short_term(interval)
    macro_news = news_bundle.get("macro_news", [])

    if macro_news:
        risks.append("Macro headlines can quickly shift sentiment even when the ticker-specific thesis looks clean")
    if technical_context.economic_pressure == "risk_off":
        risks.append("Economic pressure is risk-off, increasing correlation shocks across equities")

    if short_term:
        risks.append("Fast headline reactions can fade quickly if price does not hold the initial move")
    else:
        risks.append("Weekly trend calls can stay wrong for longer if the broader market regime changes slowly")

    if technical_context.volatility_state == "expanded":
        risks.append("Volatility is already expanded, so entries can get punished even when the thesis is directionally right")
    elif technical_context.volatility_state == "compressed":
        risks.append("Compressed volatility can break violently, so waiting too long can mean chasing the move")

    if bias.label.upper() == "BEARISH":
        risks.append("Sharp short-covering reversals remain possible if sellers lose control")
    elif bias.label.upper() == "BULLISH":
        risks.append("Momentum setups can fail quickly if buyers do not defend pullbacks")
    else:
        risks.append("Range-bound conditions can create false breaks in both directions")

    return risks[:3]


def _executive_summary(
    symbol: str,
    company: str,
    bias: BiasInfo,
    technical_context: TechnicalContext,
    primary_driver: str,
    news_bundle: dict,
    interval: str,
) -> str:
    label = bias.label.upper()
    confidence = bias.confidence_label.lower()
    lead_article = _lead_article(news_bundle)
    timeframe = "1-day range built from 1-hour bars" if _is_short_term(interval) else "1-week range built from 1-day bars"
    driver_text = primary_driver.replace("_", " ")
    catalyst_text = getattr(lead_article, "key_takeaway", "") if lead_article else ""
    fast_label, medium_label, slow_label = _level_labels(technical_context)

    if _is_short_term(interval):
        structure_text = (
            f"On the {timeframe} read, price is {technical_context.price_vs_20d} the {fast_label}, "
            f"trend score is {technical_context.trend_score}, momentum score is {technical_context.momentum_score}, "
            f"and the active range is {technical_context.support_level:.2f} to {technical_context.resistance_level:.2f}."
        )
    else:
        structure_text = (
            f"On the {timeframe} read, the medium trend is {technical_context.trend_medium}, "
            f"price is {technical_context.price_vs_200d} the {slow_label}, "
            f"trend score is {technical_context.trend_score}, and the weekly range is "
            f"{technical_context.support_level:.2f} to {technical_context.resistance_level:.2f}."
        )

    if label == "BULLISH":
        base = f"{company} currently carries a bullish bias with {confidence} confidence."
    elif label == "BEARISH":
        base = f"{company} currently carries a bearish bias with {confidence} confidence."
    else:
        base = f"{company} currently has a mixed or neutral setup."

    catalyst_sentence = (
        f" The main active driver is {driver_text}, and the lead catalyst is: {catalyst_text}"
        if catalyst_text
        else f" The main active driver is {driver_text}."
    )

    return f"{base}{catalyst_sentence} {structure_text}"


def _plain_english_summary(
    symbol: str,
    bias: BiasInfo,
    primary_driver: str,
    technical_context: TechnicalContext,
    news_bundle: dict,
    interval: str,
) -> str:
    lead_article = _lead_article(news_bundle)
    headline = getattr(lead_article, "title", "")
    watch = getattr(lead_article, "confirmation_to_watch", "") or getattr(lead_article, "invalidation_to_watch", "")
    timeframe = "1-day range with 1-hour bars" if _is_short_term(interval) else "1-week range with 1-day bars"
    fast_label, _, slow_label = _level_labels(technical_context)

    if bias.label.upper() == "BULLISH":
        opener = f"On the {timeframe} chart, buyers still have the edge in {symbol}."
    elif bias.label.upper() == "BEARISH":
        opener = f"On the {timeframe} chart, sellers still have the edge in {symbol}."
    else:
        opener = f"On the {timeframe} chart, {symbol} still looks mixed rather than cleanly directional."

    driver_line = (
        f" The biggest thing moving the story right now is {headline}."
        if headline
        else f" The main driver right now is {primary_driver.replace('_', ' ')}."
    )

    if _is_short_term(interval):
        structure_line = (
            f" Price is {technical_context.price_vs_20d} the {fast_label}, "
            f"and the working range is {technical_context.support_level:.2f} to {technical_context.resistance_level:.2f}, "
            f"so this is about near-term follow-through instead of a big long-term thesis."
        )
    else:
        structure_line = (
            f" Price is {technical_context.price_vs_200d} the {slow_label}, "
            f"and the weekly range is {technical_context.support_level:.2f} to {technical_context.resistance_level:.2f}, "
            f"so this is more about bigger-picture structure than a fast reaction trade."
        )

    watch_line = f" Watch this next: {watch}." if watch else ""
    return f"{opener}{driver_line}{structure_line}{watch_line}"


def build_professional_analysis(
    symbol: str,
    bias: BiasInfo,
    price_context: PriceContext,
    technical_context: TechnicalContext,
    news_bundle: dict,
    market_status: str,
    interval: str = "1day",
) -> ProfessionalAnalysis:
    company = company_name(symbol)

    regime = _regime_from_context(bias, technical_context)
    primary_driver = _primary_driver(bias, technical_context, news_bundle)
    secondary_drivers = _secondary_drivers(news_bundle)

    confirmation = _confirmation_lines(symbol, bias, technical_context, interval)
    invalidation = _invalidation_lines(symbol, bias, technical_context, interval)
    tactical_stance = _tactical_stance(symbol, bias, technical_context, interval)
    key_risks = _key_risks(symbol, bias, technical_context, news_bundle, interval)

    executive_summary = _executive_summary(
        symbol=symbol,
        company=company,
        bias=bias,
        technical_context=technical_context,
        primary_driver=primary_driver,
        news_bundle=news_bundle,
        interval=interval,
    )

    plain_english_summary = _plain_english_summary(
        symbol=symbol,
        bias=bias,
        primary_driver=primary_driver,
        technical_context=technical_context,
        news_bundle=news_bundle,
        interval=interval,
    )

    return ProfessionalAnalysis(
        regime=regime,
        primary_driver=primary_driver,
        secondary_drivers=secondary_drivers,
        confirmation=confirmation,
        invalidation=invalidation,
        tactical_stance=tactical_stance,
        key_risks=key_risks,
        executive_summary=executive_summary,
        plain_english_summary=plain_english_summary,
    )
