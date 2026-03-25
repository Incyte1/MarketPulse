from app.models.ticker import BiasInfo


def _article_score(direction: str, relevance: str, impact: str) -> int:
    direction_value = 0
    if direction == "bullish":
        direction_value = 1
    elif direction == "bearish":
        direction_value = -1

    relevance_weight = {
        "low": 1,
        "medium": 2,
        "high": 3,
    }.get(relevance, 1)

    impact_weight = {
        "low": 1,
        "medium": 2,
        "high": 3,
    }.get(impact, 1)

    return direction_value * relevance_weight * impact_weight


def calculate_bias(news_bundle: dict, technical_context) -> BiasInfo:
    news_score = 0
    bullish_count = 0
    bearish_count = 0
    neutral_count = 0

    for item in news_bundle["ticker_news"]:
        score = _article_score(item.direction, item.relevance, item.impact)
        news_score += score
        if item.direction == "bullish":
            bullish_count += 1
        elif item.direction == "bearish":
            bearish_count += 1
        else:
            neutral_count += 1

    for item in news_bundle["macro_news"]:
        score = _article_score(item.direction, item.relevance, item.impact)
        news_score += int(score * 0.8)
        if item.direction == "bullish":
            bullish_count += 1
        elif item.direction == "bearish":
            bearish_count += 1
        else:
            neutral_count += 1

    technical_score = technical_context.structure_score

    confirmation_score = 0
    if news_score > 0 and technical_score > 0:
        confirmation_score = 4
    elif news_score < 0 and technical_score < 0:
        confirmation_score = -4

    total_score = news_score + technical_score + confirmation_score

    if total_score >= 8:
        label = "BULLISH"
    elif total_score <= -8:
        label = "BEARISH"
    else:
        label = "NEUTRAL"

    confidence_value = min(abs(total_score) * 5, 100)
    if confidence_value >= 75:
        confidence_label = "High"
    elif confidence_value >= 45:
        confidence_label = "Moderate"
    else:
        confidence_label = "Low"

    return BiasInfo(
        label=label,
        confidence_label=confidence_label,
        confidence_value=confidence_value,
        internal_score=total_score,
        total_score=total_score,
        news_score=news_score,
        technical_score=technical_score,
        confirmation_score=confirmation_score,
        bullish_count=bullish_count,
        bearish_count=bearish_count,
        neutral_count=neutral_count,
    )