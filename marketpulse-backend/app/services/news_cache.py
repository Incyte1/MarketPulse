import hashlib
import json
import sqlite3
from pathlib import Path
from typing import Optional

from app.core.config import settings


class NewsInterpretationCache:
    def __init__(self, db_path: str):
        self.db_path = Path(db_path)
        self._init_db()

    def _connect(self) -> sqlite3.Connection:
        return sqlite3.connect(self.db_path)

    def _init_db(self) -> None:
        with self._connect() as conn:
            conn.execute(
                """
                CREATE TABLE IF NOT EXISTS news_cache (
                    cache_key TEXT PRIMARY KEY,
                    payload TEXT NOT NULL
                )
                """
            )
            conn.commit()

    @staticmethod
    def make_key(
        symbol: str,
        headline: str,
        snippet: str,
        timeframe: str,
        model_name: str,
        prompt_version: str = "v1",
    ) -> str:
        raw = "||".join(
            [
                symbol.strip().upper(),
                headline.strip(),
                snippet.strip(),
                timeframe.strip(),
                model_name.strip(),
                prompt_version,
            ]
        )
        return hashlib.sha256(raw.encode("utf-8")).hexdigest()

    def get(self, cache_key: str) -> Optional[dict]:
        with self._connect() as conn:
            row = conn.execute(
                "SELECT payload FROM news_cache WHERE cache_key = ?",
                (cache_key,),
            ).fetchone()

        if not row:
            return None

        return json.loads(row[0])

    def set(self, cache_key: str, payload: dict) -> None:
        with self._connect() as conn:
            conn.execute(
                """
                INSERT OR REPLACE INTO news_cache (cache_key, payload)
                VALUES (?, ?)
                """,
                (cache_key, json.dumps(payload)),
            )
            conn.commit()

cache = NewsInterpretationCache(str(settings.resolve_data_path(settings.openai_news_cache_db)))
