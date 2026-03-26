from __future__ import annotations

import os
import tempfile
import unittest
from pathlib import Path
from unittest.mock import patch

from app.models.ticker import PriceContext
from app.services import cache_db, refresh_service


class RefreshServiceTests(unittest.TestCase):
    def setUp(self) -> None:
        self.original_cache_path = cache_db.DB_PATH
        fd, temp_path = tempfile.mkstemp(suffix="_cache_test.db")
        os.close(fd)
        self.temp_cache_path = Path(temp_path)
        cache_db.DB_PATH = self.temp_cache_path
        cache_db.init_cache_db()

    def tearDown(self) -> None:
        cache_db.DB_PATH = self.original_cache_path
        try:
            self.temp_cache_path.unlink(missing_ok=True)
        except PermissionError:
            pass

    def test_get_price_context_cached_uses_stale_cache_when_live_fetch_fails(self) -> None:
        expected = PriceContext(
            current_price=601.25,
            previous_close=598.0,
            daily_change=3.25,
            daily_change_percent=0.54,
            trend_5d="up",
        )
        cache_db.cache_set("price:SPY", "price", expected.model_dump())

        with patch("app.services.refresh_service.get_price_context", side_effect=ValueError("provider down")):
            context = refresh_service._get_price_context_cached("SPY")

        self.assertEqual(context.current_price, expected.current_price)
        self.assertEqual(context.trend_5d, expected.trend_5d)


if __name__ == "__main__":
    unittest.main()
