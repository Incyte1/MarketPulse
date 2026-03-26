import json
import sqlite3
import time
from typing import Any, Optional

from app.core.config import settings

DB_PATH = settings.resolve_data_path(settings.cache_db_path)


def _connect() -> sqlite3.Connection:
    return sqlite3.connect(DB_PATH)


def init_cache_db() -> None:
    with _connect() as conn:
        conn.execute(
            """
            CREATE TABLE IF NOT EXISTS cache_entries (
                cache_key TEXT PRIMARY KEY,
                cache_type TEXT NOT NULL,
                payload TEXT NOT NULL,
                updated_at REAL NOT NULL
            )
            """
        )
        conn.commit()


def cache_get(cache_key: str, max_age_seconds: int) -> Optional[dict[str, Any]]:
    with _connect() as conn:
        row = conn.execute(
            """
            SELECT payload, updated_at
            FROM cache_entries
            WHERE cache_key = ?
            """,
            (cache_key,),
        ).fetchone()

    if not row:
        return None

    payload, updated_at = row
    if (time.time() - updated_at) > max_age_seconds:
        return None

    return json.loads(payload)


def cache_set(cache_key: str, cache_type: str, payload: dict[str, Any]) -> None:
    with _connect() as conn:
        conn.execute(
            """
            INSERT OR REPLACE INTO cache_entries (cache_key, cache_type, payload, updated_at)
            VALUES (?, ?, ?, ?)
            """,
            (cache_key, cache_type, json.dumps(payload), time.time()),
        )
        conn.commit()
