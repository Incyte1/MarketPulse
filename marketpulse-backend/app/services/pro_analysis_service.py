from __future__ import annotations

from app.models.ticker import (
    BiasInfo,
    PriceContext,
    ProfessionalAnalysis,
    TechnicalContext,
)
from app.utils.symbols import company_name


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
) -> list[str]:
    lines = []

    if bias.label.upper() == "BULLISH":
        if technical_context.price_vs_20d == "above":
            lines.append("Price is holding above the 20-day average")
        if technical_context.price_vs_50d == "above":
            lines.append("Price is holding above the 50-day average")
        if technical_context.price_vs_200d == "above":
            lines.append("Price is holding above the 200-day trend line")
        if technical_context.macd >= technical_context.macd_signal:
            lines.append("MACD remains in bullish alignment")
        if technical_context.momentum_state in {"positive", "bullish"}:
            lines.append("Momentum is supportive rather than fading")

    elif bias.label.upper() == "BEARISH":
        if technical_context.price_vs_20d == "below":
            lines.append("Price is below the 20-day average")
        if technical_context.price_vs_50d == "below":
            lines.append("Price is below the 50-day average")
        if technical_context.price_vs_200d == "below":
            lines.append("Price is below the 200-day trend line")
        if technical_context.macd < technical_context.macd_signal:
            lines.append("MACD still favors downside momentum")
        if technical_context.momentum_state in {"negative", "bearish"}:
            lines.append("Momentum still favors sellers")

    if not lines:
        lines.append("The chart is not fully confirming one clean directional thesis yet")

    return lines[:3]


def _invalidation_lines(
    symbol: str,
    bias: BiasInfo,
    technical_context: TechnicalContext,
) -> list[str]:
    lines = []

    if bias.label.upper() == "BULLISH":
        lines.append("A failed breakout or fast move back below near-term support would weaken the bullish read")
        if technical_context.price_vs_20d == "below":
            lines.append("Failure to reclaim the 20-day average would reduce confidence")
        if technical_context.stoch_rsi_k and technical_context.stoch_rsi_k >= 85:
            lines.append("An overbought StochRSI state increases pullback risk")

    elif bias.label.upper() == "BEARISH":
        lines.append("A strong reclaim of resistance would weaken the bearish read")
        if technical_context.price_vs_20d == "below":
            lines.append("Sustained recovery back above the 20-day average would reduce downside confidence")
        if technical_context.price_vs_50d == "below":
            lines.append("Recovery above the 50-day average would materially weaken the bearish thesis")
        if technical_context.stoch_rsi_k and technical_context.stoch_rsi_k <= 15:
            lines.append("An oversold StochRSI state increases squeeze risk")

    else:
        lines.append("A decisive break out of the current range would invalidate the neutral read")

    return lines[:3]


def _tactical_stance(symbol: str, bias: BiasInfo, technical_context: TechnicalContext) -> str:
    if bias.label.upper() == "BULLISH":
        return "Favor continuation setups, pullback holds, and strength that keeps building above support."

    if bias.label.upper() == "BEARISH":
        return "Favor failed bounces, weak reclaims, and downside continuation rather than aggressive counter-trend longs."

    return "Stay selective and wait for cleaner confirmation before pressing directional exposure."


def _key_risks(symbol: str, bias: BiasInfo, technical_context: TechnicalContext, news_bundle: dict) -> list[str]:
    risks = []

    macro_news = news_bundle.get("macro_news", [])
    if macro_news:
        risks.append("Macro headlines can quickly shift sentiment even when the ticker-specific thesis looks clean")
    if technical_context.economic_pressure == "risk_off":
        risks.append("Economic pressure is risk-off, increasing correlation shocks across equities")

    if bias.label.upper() == "BEARISH":
        risks.append("Sharp short-covering reversals remain possible if sellers lose control")
    elif bias.label.upper() == "BULLISH":
        risks.append("Momentum setups can fail quickly if buyers do not defend pullbacks")
    else:
        risks.append("Range-bound conditions can create false breaks in both directions")

    risks.append("Headline-driven moves still require price confirmation before becoming durable trade signals")
    return risks[:3]


def _executive_summary(
    symbol: str,
    company: str,
    bias: BiasInfo,
    technical_context: TechnicalContext,
    primary_driver: str,
) -> str:
    label = bias.label.upper()
    confidence = bias.confidence_label.lower()

    if label == "BULLISH":
        return (
            f"{company} currently carries a bullish bias with {confidence} confidence. "
            f"The read is being driven primarily by {primary_driver.replace('_', ' ')}, "
            f"while the chart is showing constructive structure rather than clear weakness."
        )

    if label == "BEARISH":
        return (
            f"{company} currently carries a bearish bias with {confidence} confidence. "
            f"The read is being driven primarily by {primary_driver.replace('_', ' ')}, "
            f"while the chart is still favoring sellers instead of confirming a durable reversal."
        )

    return (
        f"{company} currently has a mixed or neutral setup. "
        f"Inputs are not aligned enough yet to justify a strong directional view."
    )


def _plain_english_summary(
    symbol: str,
    bias: BiasInfo,
    primary_driver: str,
) -> str:
    if bias.label.upper() == "BULLISH":
        return (
            f"In simple terms, MarketPulse sees a constructive setup in {symbol}, "
            f"but the trade still needs price to keep confirming the bullish story."
        )

    if bias.label.upper() == "BEARISH":
        return (
            f"In simple terms, MarketPulse thinks {symbol} is still vulnerable, "
            f"and the path of least resistance remains lower unless buyers reclaim control."
        )

    return (
        f"In simple terms, MarketPulse does not see a clean edge in {symbol} yet. "
        f"Price and catalysts are not aligned enough for a strong directional call."
    )


def build_professional_analysis(
    symbol: str,
    bias: BiasInfo,
    price_context: PriceContext,
    technical_context: TechnicalContext,
    news_bundle: dict,
    market_status: str,
) -> ProfessionalAnalysis:
    company = company_name(symbol)

    regime = _regime_from_context(bias, technical_context)
    primary_driver = _primary_driver(bias, technical_context, news_bundle)
    secondary_drivers = _secondary_drivers(news_bundle)

    confirmation = _confirmation_lines(symbol, bias, technical_context)
    invalidation = _invalidation_lines(symbol, bias, technical_context)
    tactical_stance = _tactical_stance(symbol, bias, technical_context)
    key_risks = _key_risks(symbol, bias, technical_context, news_bundle)

    executive_summary = _executive_summary(
        symbol=symbol,
        company=company,
        bias=bias,
        technical_context=technical_context,
        primary_driver=primary_driver,
    )

    plain_english_summary = _plain_english_summary(
        symbol=symbol,
        bias=bias,
        primary_driver=primary_driver,
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
