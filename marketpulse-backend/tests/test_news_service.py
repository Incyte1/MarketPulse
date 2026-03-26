from __future__ import annotations

import unittest

from app.models.ticker import InterpretedArticle, PriceContext, TechnicalContext
from app.services.news_service import (
    _to_interpreted,
    enrich_news_bundle_with_market_context,
    filter_news_bundle_for_interval,
    sanitize_interpreted_articles,
)


class NewsServiceTests(unittest.TestCase):
    def test_filter_news_bundle_drops_sector_story_from_macro_bucket(self) -> None:
        macro_article = InterpretedArticle(
            title="Treasury yields rise ahead of Fed remarks",
            article_type="macro",
            relevance="high",
            direction="bearish",
            impact="high",
            explanation="macro explanation",
            impact_area=["rates"],
            market_scope="macro",
        )
        sector_article = InterpretedArticle(
            title="Cybersecurity ETFs outperform fintech peers",
            article_type="sector",
            relevance="medium",
            direction="neutral",
            impact="medium",
            explanation="sector explanation",
            impact_area=["sector_rotation"],
            market_scope="sector",
        )

        filtered = filter_news_bundle_for_interval(
            {"ticker_news": [], "macro_news": [sector_article, macro_article]},
            "1day",
        )

        self.assertEqual(len(filtered["macro_news"]), 1)
        self.assertEqual(filtered["macro_news"][0].title, macro_article.title)

    def test_enrich_news_bundle_with_market_context_fills_levels(self) -> None:
        article = InterpretedArticle(
            title="Oil shipping risk builds in the Middle East",
            article_type="geopolitics",
            relevance="medium",
            direction="bearish",
            impact="high",
            explanation="generic",
            key_takeaway="Shipping or energy disruption can move oil and risk appetite.",
            trade_relevance="Relevant for index traders, but requires clear sector/breadth confirmation before acting.",
            confirmation_to_watch=None,
            invalidation_to_watch=None,
            impact_area=["energy", "shipping"],
            market_scope="macro",
        )

        enriched = enrich_news_bundle_with_market_context(
            symbol="SPY",
            price_context=PriceContext(current_price=612.34),
            technical_context=TechnicalContext(
                support_level=608.5,
                resistance_level=615.75,
                ema_20=611.1,
                ema_50=610.2,
                vwap=611.8,
                range_position_percent=52.0,
                regime_state="volatile_rotation",
                fast_indicator_label="5-hour EMA",
                medium_indicator_label="8-hour EMA",
            ),
            news_bundle={"ticker_news": [], "macro_news": [article]},
            interval="1day",
        )

        enriched_article = enriched["macro_news"][0]
        self.assertIn("608.50", enriched_article.confirmation_to_watch)
        self.assertIn("615.75", enriched_article.invalidation_to_watch)
        self.assertIn("SPY", enriched_article.explanation)
        self.assertIn("support", enriched_article.explanation.lower())

    def test_to_interpreted_avoids_repeating_duplicate_title_text(self) -> None:
        raw_article = {
            "title": "Bahrain pushes UN-backed action for Hormuz shipping - Reuters",
            "description": "Bahrain pushes UN-backed action for Hormuz shipping - Reuters",
            "content": "Bahrain pushes UN-backed action for Hormuz shipping - Reuters",
            "source": {"name": "Reuters"},
            "publishedAt": "2026-03-23T19:10:22Z",
            "url": "https://example.com/hormuz-story",
        }

        interpreted = _to_interpreted("SPY", raw_article)

        self.assertEqual(
            interpreted.key_takeaway,
            "Bahrain pushes UN-backed action for Hormuz shipping - Reuters",
        )

    def test_sanitize_interpreted_articles_blocks_string_source_names(self) -> None:
        blocked = InterpretedArticle(
            title="Opinionated note",
            source="SeekingAlpha",
            article_type="general",
            relevance="medium",
            direction="neutral",
            impact="medium",
            explanation="blocked",
        )
        allowed = InterpretedArticle(
            title="Reuters market note",
            source="Reuters",
            article_type="macro",
            relevance="high",
            direction="neutral",
            impact="high",
            explanation="allowed",
        )

        sanitized = sanitize_interpreted_articles([blocked, allowed])

        self.assertEqual(len(sanitized), 1)
        self.assertEqual(sanitized[0].source, "Reuters")


if __name__ == "__main__":
    unittest.main()
