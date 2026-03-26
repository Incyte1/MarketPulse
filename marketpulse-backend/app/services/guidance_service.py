from app.models.ticker import GuidanceInfo
from app.utils.symbols import company_name


def build_guidance(symbol: str, bias, market_status: str, interval: str, technical_context=None) -> GuidanceInfo:
    short_term = {"1min", "5min", "15min", "1h", "1day"}
    mode = "1-day range using 1-hour bars" if interval in short_term else "1-week range using 1-day bars"
    regime_text = ""
    if technical_context is not None:
        regime_text = (
            f" Current regime is {technical_context.regime_state.replace('_', ' ')} with "
            f"{technical_context.volatility_state} volatility."
        )

    if bias.label == "BULLISH":
        headline = "Bullish conditions currently favored"
        summary = (
            f"{company_name(symbol)} shows a bullish analytical read with {bias.confidence_label.lower()} confidence "
            f"for a {mode} view. News interpretation and chart structure are working together rather than conflicting."
            f"{regime_text}"
        )
        preferred_direction = "long"
    elif bias.label == "BEARISH":
        headline = "Bearish conditions currently favored"
        summary = (
            f"{company_name(symbol)} shows a bearish analytical read with {bias.confidence_label.lower()} confidence "
            f"for a {mode} view. Negative drivers and chart structure currently outweigh constructive signals."
            f"{regime_text}"
        )
        preferred_direction = "short"
    else:
        headline = "Conditions are mixed"
        summary = (
            f"{company_name(symbol)} currently has a neutral analytical read. "
            f"The system sees mixed evidence, which usually means patience is better than forcing a strong directional view."
            f"{regime_text}"
        )
        preferred_direction = "neutral"

    warnings = []
    if market_status != "OPEN":
        warnings.append("Market is closed, so this should be used as planning guidance rather than live execution support.")

    return GuidanceInfo(
        headline=headline,
        summary=summary,
        preferred_direction=preferred_direction,
        warnings=warnings,
    )
