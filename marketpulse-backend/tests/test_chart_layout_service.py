from __future__ import annotations

import os
import tempfile
import unittest
from pathlib import Path

from app.models.charting import (
    ChartLayoutCreateRequest,
    ChartLayoutPayload,
    ChartLayoutUpdateRequest,
    ChartUserSettingsUpdateRequest,
)
from app.services import auth_service, chart_layout_service


class ChartLayoutServiceTests(unittest.TestCase):
    def setUp(self) -> None:
        self.original_auth_db_path = auth_service.DB_PATH
        self.original_chart_db_path = chart_layout_service.DB_PATH
        fd, temp_path = tempfile.mkstemp(suffix="_charting_test.db")
        os.close(fd)
        self.temp_db_path = Path(temp_path)

        auth_service.DB_PATH = self.temp_db_path
        chart_layout_service.DB_PATH = self.temp_db_path

        auth_service.init_auth_db()
        chart_layout_service.init_chart_layout_db()
        self.session = auth_service.register_user(
            name="Chart User",
            email="chart@example.com",
            password="Password123",
        )

    def tearDown(self) -> None:
        auth_service.DB_PATH = self.original_auth_db_path
        chart_layout_service.DB_PATH = self.original_chart_db_path
        try:
            self.temp_db_path.unlink(missing_ok=True)
        except PermissionError:
            pass

    def test_bootstrap_creates_default_layout_and_settings(self) -> None:
        bootstrap = chart_layout_service.get_charting_bootstrap(self.session.user.id)

        self.assertEqual(len(bootstrap.layouts), 1)
        self.assertTrue(bootstrap.layouts[0].is_default)
        self.assertEqual(bootstrap.settings.last_symbol, "SPY")
        self.assertIn("60", bootstrap.settings.favorite_intervals)

    def test_create_and_update_chart_layout(self) -> None:
        created = chart_layout_service.create_chart_layout(
            self.session.user.id,
            ChartLayoutCreateRequest(
                name="Breakout Deck",
                symbol="NVDA",
                interval="15",
                theme="dark",
                payload=ChartLayoutPayload(
                    symbol="NVDA",
                    interval="15",
                    theme="dark",
                    indicators=["VWAP", "EMA 20"],
                    active_tool="trend_line",
                    notes="Opening drive setup",
                ),
            ),
        )

        self.assertEqual(created.symbol, "NVDA")
        self.assertEqual(created.payload.active_tool, "trend_line")

        updated = chart_layout_service.update_chart_layout(
            self.session.user.id,
            created.id,
            ChartLayoutUpdateRequest(
                interval="1D",
                theme="light",
                payload=ChartLayoutPayload(
                    symbol="NVDA",
                    interval="1D",
                    theme="light",
                    indicators=["EMA 50", "Volume"],
                    active_tool="cursor",
                    notes="Swing view",
                ),
            ),
        )

        self.assertEqual(updated.interval, "1D")
        self.assertEqual(updated.theme, "light")
        self.assertIn("EMA 50", updated.payload.indicators)

    def test_settings_upsert_persists_last_symbol_and_theme(self) -> None:
        settings = chart_layout_service.upsert_chart_user_settings(
            self.session.user.id,
            ChartUserSettingsUpdateRequest(
                theme="light",
                last_symbol="MSFT",
                last_interval="1D",
                favorite_intervals=["60", "1D"],
                watchlist_symbols=["MSFT", "NVDA", "SPY"],
                left_toolbar_open=False,
            ),
        )

        self.assertEqual(settings.theme, "light")
        self.assertEqual(settings.last_symbol, "MSFT")
        self.assertFalse(settings.left_toolbar_open)


if __name__ == "__main__":
    unittest.main()
