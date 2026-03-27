from __future__ import annotations

import os
import tempfile
import unittest
from pathlib import Path
from unittest.mock import patch

from app.models.ticker import (
    BiasInfo,
    GuidanceInfo,
    PriceContext,
    ProfessionalAnalysis,
    TechnicalContext,
    TickerAnalysisResponse,
)
from app.services import auth_service, portfolio_service, workflow_service
from app.services.portfolio_report_service import (
    build_workspace_execution_preview,
    build_workspace_portfolio_report,
)


def _analysis(
    symbol: str,
    *,
    bias_label: str,
    total_score: int,
    confidence_value: int,
    structure_score: int,
    trend_score: int,
    momentum_score: int,
    preferred_direction: str,
    primary_driver: str,
) -> TickerAnalysisResponse:
    confidence_label = "High" if confidence_value >= 75 else "Moderate" if confidence_value >= 45 else "Low"
    trend_medium = "bullish" if trend_score > 0 else "bearish" if trend_score < 0 else "neutral"
    momentum_state = "positive" if momentum_score > 0 else "negative" if momentum_score < 0 else "neutral"
    regime_state = "trend_up" if trend_score >= 3 else "trend_down" if trend_score <= -3 else "range"

    return TickerAnalysisResponse(
        symbol=symbol,
        company_name=f"{symbol} Corp",
        market_status="OPEN",
        price_context=PriceContext(current_price=100.0, daily_change_percent=1.2),
        technical_context=TechnicalContext(
            trend_medium=trend_medium,
            momentum_state=momentum_state,
            regime_state=regime_state,
            support_level=95.0,
            resistance_level=105.0,
            trend_score=trend_score,
            momentum_score=momentum_score,
            structure_score=structure_score,
        ),
        bias=BiasInfo(
            label=bias_label,
            confidence_label=confidence_label,
            confidence_value=confidence_value,
            total_score=total_score,
        ),
        guidance=GuidanceInfo(
            headline=f"{bias_label.title()} conditions currently favored",
            preferred_direction=preferred_direction,
        ),
        professional_analysis=ProfessionalAnalysis(
            primary_driver=primary_driver,
            confirmation=["Trend alignment is supportive."],
            invalidation=["The structure is weakening."],
            key_risks=["Volatility can reverse quickly."],
            plain_english_summary=f"{symbol} portfolio summary.",
        ),
        interpreted_ticker_news=[],
        interpreted_macro_news=[],
    )


def _features(
    symbol: str,
    *,
    benchmark_symbol: str = "SPY",
    sector_etf: str = "XLK",
    sector: str = "Technology",
    relative_strength_20d: float = 0.0,
    relative_strength_sector_20d: float = 0.0,
    return_20d: float = 0.0,
    volume_ratio_20d: float = 1.0,
    market_tone: str = "mixed",
) -> dict:
    return {
        "symbol": symbol,
        "company_name": f"{symbol} Corp",
        "sector": sector,
        "subsector": "General",
        "benchmark_symbol": benchmark_symbol,
        "sector_etf": sector_etf,
        "return_5d": round(return_20d / 4.0, 2),
        "return_20d": return_20d,
        "return_50d": round(return_20d * 1.8, 2),
        "benchmark_return_20d": 3.0,
        "sector_return_20d": 2.0,
        "spy_return_20d": 2.5,
        "relative_strength_20d": relative_strength_20d,
        "relative_strength_sector_20d": relative_strength_sector_20d,
        "volume_ratio_20d": volume_ratio_20d,
        "atr_percent": 2.4,
        "market_tone": market_tone,
    }


class PortfolioServiceTests(unittest.TestCase):
    def setUp(self) -> None:
        self.original_auth_db_path = auth_service.DB_PATH
        self.original_workflow_db_path = workflow_service.DB_PATH
        fd, temp_path = tempfile.mkstemp(suffix="_portfolio_test.db")
        os.close(fd)
        self.temp_db_path = Path(temp_path)

        auth_service.DB_PATH = self.temp_db_path
        workflow_service.DB_PATH = self.temp_db_path

        auth_service.init_auth_db()
        workflow_service.init_workflow_db()

        self.session = auth_service.register_user(
            name="Portfolio User",
            email="portfolio@example.com",
            password="Password123",
        )

    def tearDown(self) -> None:
        auth_service.DB_PATH = self.original_auth_db_path
        workflow_service.DB_PATH = self.original_workflow_db_path
        try:
            self.temp_db_path.unlink(missing_ok=True)
        except PermissionError:
            pass

    def test_workspace_portfolio_ranks_buy_hold_and_sell_queues(self) -> None:
        workspace = workflow_service.create_workspace(
            user_id=self.session.user.id,
            name="Signal Desk",
            selected_symbol="NVDA",
            selected_horizon="short_term",
        )

        for symbol in ["AAPL", "MSFT", "TSLA"]:
            workflow_service.add_watchlist_symbol(
                user_id=self.session.user.id,
                workspace_id=workspace.id,
                symbol=symbol,
            )

        workflow_service.update_workspace(
            user_id=self.session.user.id,
            workspace_id=workspace.id,
            selected_symbol="NVDA",
        )

        analyses = {
            "NVDA": _analysis(
                "NVDA",
                bias_label="BULLISH",
                total_score=12,
                confidence_value=80,
                structure_score=6,
                trend_score=4,
                momentum_score=3,
                preferred_direction="long",
                primary_driver="price_structure_and_trend",
            ),
            "AAPL": _analysis(
                "AAPL",
                bias_label="BULLISH",
                total_score=8,
                confidence_value=62,
                structure_score=4,
                trend_score=3,
                momentum_score=2,
                preferred_direction="long",
                primary_driver="macro_flow",
            ),
            "MSFT": _analysis(
                "MSFT",
                bias_label="NEUTRAL",
                total_score=1,
                confidence_value=24,
                structure_score=1,
                trend_score=0,
                momentum_score=0,
                preferred_direction="neutral",
                primary_driver="mixed_inputs",
            ),
            "TSLA": _analysis(
                "TSLA",
                bias_label="BEARISH",
                total_score=-10,
                confidence_value=74,
                structure_score=-6,
                trend_score=-4,
                momentum_score=-2,
                preferred_direction="short",
                primary_driver="price_structure_and_trend",
            ),
        }
        features = {
            "NVDA": _features(
                "NVDA",
                relative_strength_20d=4.5,
                relative_strength_sector_20d=3.6,
                return_20d=12.0,
                volume_ratio_20d=1.4,
                market_tone="risk_on",
            ),
            "AAPL": _features(
                "AAPL",
                relative_strength_20d=2.0,
                relative_strength_sector_20d=1.2,
                return_20d=8.0,
                volume_ratio_20d=1.1,
                market_tone="risk_on",
            ),
            "MSFT": _features(
                "MSFT",
                relative_strength_20d=0.1,
                relative_strength_sector_20d=0.0,
                return_20d=3.0,
                volume_ratio_20d=0.95,
            ),
            "TSLA": _features(
                "TSLA",
                benchmark_symbol="QQQ",
                sector_etf="XLY",
                sector="Consumer Discretionary",
                relative_strength_20d=-5.5,
                relative_strength_sector_20d=-4.2,
                return_20d=-10.0,
                volume_ratio_20d=1.3,
                market_tone="risk_off",
            ),
        }

        with patch(
            "app.services.portfolio_service._analysis_for_symbol",
            side_effect=lambda symbol, interval: analyses[symbol],
        ), patch(
            "app.services.portfolio_service.get_multivariate_signal_context",
            side_effect=lambda symbol: features[symbol],
        ):
            result = portfolio_service.build_workspace_portfolio(self.session.user.id, workspace.id)

        self.assertEqual(result.coverage_count, 4)
        self.assertEqual([item.symbol for item in result.buy_queue], ["NVDA", "AAPL"])
        self.assertEqual([item.symbol for item in result.hold_queue], ["MSFT"])
        self.assertEqual([item.symbol for item in result.sell_queue], ["TSLA"])
        self.assertTrue(result.overview.startswith("Signal Desk has 2 buy candidates"))
        self.assertTrue(all(item.slot_status == "primary" for item in result.buy_queue))
        self.assertGreater(result.buy_queue[0].target_weight_percent, result.buy_queue[1].target_weight_percent)

        with patch(
            "app.services.portfolio_service._analysis_for_symbol",
            side_effect=lambda symbol, interval: analyses[symbol],
        ), patch(
            "app.services.portfolio_service.get_multivariate_signal_context",
            side_effect=lambda symbol: features[symbol],
        ):
            report = build_workspace_portfolio_report(self.session.user.id, workspace.id)
            preview = build_workspace_execution_preview(self.session.user.id, workspace.id)

        self.assertIn("daily portfolio summary", report.email_subject)
        self.assertEqual(preview.alpaca_status.configured, False)
        self.assertTrue(any(action.action == "buy" for action in preview.proposed_actions))


if __name__ == "__main__":
    unittest.main()
