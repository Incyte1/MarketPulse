from __future__ import annotations

import json
import sqlite3
from datetime import datetime, timezone

from app.core.config import settings
from app.models.charting import (
    ChartLayoutCreateRequest,
    ChartLayoutDocument,
    ChartLayoutPayload,
    ChartLayoutSummary,
    ChartLayoutUpdateRequest,
    ChartUserSettings,
    ChartUserSettingsUpdateRequest,
    ChartingBootstrapResponse,
)

DB_PATH = settings.resolve_data_path(settings.auth_db_path)


def _connect() -> sqlite3.Connection:
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA foreign_keys = ON")
    return conn


def _utc_now() -> str:
    return datetime.now(timezone.utc).isoformat()


def init_chart_layout_db() -> None:
    with _connect() as conn:
        conn.execute(
            """
            CREATE TABLE IF NOT EXISTS chart_layouts (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id INTEGER NOT NULL,
                name TEXT NOT NULL,
                symbol TEXT NOT NULL,
                interval TEXT NOT NULL,
                theme TEXT NOT NULL DEFAULT 'dark',
                is_default INTEGER NOT NULL DEFAULT 0,
                payload_json TEXT NOT NULL DEFAULT '{}',
                created_at TEXT NOT NULL,
                updated_at TEXT NOT NULL,
                FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
            )
            """
        )
        conn.execute(
            """
            CREATE TABLE IF NOT EXISTS chart_user_settings (
                user_id INTEGER PRIMARY KEY,
                theme TEXT NOT NULL DEFAULT 'dark',
                favorite_intervals TEXT NOT NULL DEFAULT '["15","60","1D","1W"]',
                favorite_indicators TEXT NOT NULL DEFAULT '["VWAP","EMA 20","EMA 50","Volume"]',
                watchlist_symbols TEXT NOT NULL DEFAULT '["SPY","QQQ","NVDA","MSFT"]',
                last_symbol TEXT NOT NULL DEFAULT 'SPY',
                last_interval TEXT NOT NULL DEFAULT '60',
                left_toolbar_open INTEGER NOT NULL DEFAULT 1,
                right_sidebar_open INTEGER NOT NULL DEFAULT 1,
                updated_at TEXT NOT NULL,
                FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
            )
            """
        )
        conn.commit()


def _normalize_symbol(value: str) -> str:
    normalized = value.strip().upper()
    if not normalized:
        raise ValueError("Symbol is required.")
    return normalized


def _normalize_interval(value: str) -> str:
    normalized = value.strip().upper()
    allowed = {"1", "5", "15", "60", "240", "1D", "1W", "1M"}
    if normalized not in allowed:
        raise ValueError("Unsupported interval.")
    return normalized


def _normalize_theme(value: str) -> str:
    normalized = value.strip().lower()
    if normalized not in {"dark", "light"}:
        raise ValueError("Theme must be dark or light.")
    return normalized


def _normalize_layout_name(value: str) -> str:
    cleaned = value.strip()
    if len(cleaned) < 2:
        raise ValueError("Layout name must be at least 2 characters.")
    return cleaned


def _payload_json(payload: ChartLayoutPayload) -> str:
    return json.dumps(payload.model_dump(), separators=(",", ":"))


def _parse_json_list(raw: str | None, fallback: list[str]) -> list[str]:
    if not raw:
        return fallback

    try:
        parsed = json.loads(raw)
    except json.JSONDecodeError:
        return fallback

    if not isinstance(parsed, list):
        return fallback

    cleaned = [str(item).strip() for item in parsed if str(item).strip()]
    return cleaned or fallback


def _default_payload(symbol: str = "SPY", interval: str = "60", theme: str = "dark") -> ChartLayoutPayload:
    return ChartLayoutPayload(
        symbol=symbol,
        interval=interval,
        theme=theme,
        indicators=["VWAP", "EMA 20", "Volume"],
        drawings=[],
        active_tool="cursor",
        notes="Primary chart deck.",
        tv_chart_content={},
    )


def _ensure_settings(conn: sqlite3.Connection, user_id: int) -> None:
    row = conn.execute("SELECT user_id FROM chart_user_settings WHERE user_id = ?", (user_id,)).fetchone()
    if row is not None:
        return

    conn.execute(
        """
        INSERT INTO chart_user_settings (
            user_id, theme, favorite_intervals, favorite_indicators, watchlist_symbols,
            last_symbol, last_interval, left_toolbar_open, right_sidebar_open, updated_at
        ) VALUES (?, 'dark', '["15","60","1D","1W"]', '["VWAP","EMA 20","EMA 50","Volume"]',
                  '["SPY","QQQ","NVDA","MSFT"]', 'SPY', '60', 1, 1, ?)
        """,
        (user_id, _utc_now()),
    )


def _ensure_default_layout(conn: sqlite3.Connection, user_id: int) -> None:
    row = conn.execute("SELECT id FROM chart_layouts WHERE user_id = ? LIMIT 1", (user_id,)).fetchone()
    if row is not None:
        return

    now = _utc_now()
    default_payload = _default_payload()
    conn.execute(
        """
        INSERT INTO chart_layouts (
            user_id, name, symbol, interval, theme, is_default, payload_json, created_at, updated_at
        ) VALUES (?, 'Primary Layout', 'SPY', '60', 'dark', 1, ?, ?, ?)
        """,
        (user_id, _payload_json(default_payload), now, now),
    )


def _row_to_layout_summary(row: sqlite3.Row) -> ChartLayoutSummary:
    return ChartLayoutSummary(
        id=int(row["id"]),
        name=str(row["name"]),
        symbol=str(row["symbol"]),
        interval=str(row["interval"]),
        theme=str(row["theme"]),
        is_default=bool(row["is_default"]),
        updated_at=str(row["updated_at"]),
    )


def _row_to_layout_document(row: sqlite3.Row) -> ChartLayoutDocument:
    raw_payload = row["payload_json"] or "{}"
    try:
        payload = ChartLayoutPayload(**json.loads(raw_payload))
    except (json.JSONDecodeError, TypeError, ValueError):
        payload = _default_payload(
            symbol=str(row["symbol"]),
            interval=str(row["interval"]),
            theme=str(row["theme"]),
        )

    return ChartLayoutDocument(
        id=int(row["id"]),
        name=str(row["name"]),
        symbol=str(row["symbol"]),
        interval=str(row["interval"]),
        theme=str(row["theme"]),
        is_default=bool(row["is_default"]),
        created_at=str(row["created_at"]),
        updated_at=str(row["updated_at"]),
        payload=payload,
    )


def _row_to_settings(row: sqlite3.Row | None) -> ChartUserSettings:
    if row is None:
        return ChartUserSettings()

    return ChartUserSettings(
        theme=str(row["theme"] or "dark"),
        favorite_intervals=_parse_json_list(row["favorite_intervals"], ["15", "60", "1D", "1W"]),
        favorite_indicators=_parse_json_list(row["favorite_indicators"], ["VWAP", "EMA 20", "EMA 50", "Volume"]),
        watchlist_symbols=_parse_json_list(row["watchlist_symbols"], ["SPY", "QQQ", "NVDA", "MSFT"]),
        last_symbol=str(row["last_symbol"] or "SPY"),
        last_interval=str(row["last_interval"] or "60"),
        left_toolbar_open=bool(row["left_toolbar_open"]),
        right_sidebar_open=bool(row["right_sidebar_open"]),
        updated_at=str(row["updated_at"] or ""),
    )


def get_charting_bootstrap(user_id: int) -> ChartingBootstrapResponse:
    with _connect() as conn:
        _ensure_settings(conn, user_id)
        _ensure_default_layout(conn, user_id)
        conn.commit()

        layout_rows = conn.execute(
            """
            SELECT id, name, symbol, interval, theme, is_default, updated_at
            FROM chart_layouts
            WHERE user_id = ?
            ORDER BY is_default DESC, updated_at DESC
            """,
            (user_id,),
        ).fetchall()
        settings_row = conn.execute(
            """
            SELECT theme, favorite_intervals, favorite_indicators, watchlist_symbols,
                   last_symbol, last_interval, left_toolbar_open, right_sidebar_open, updated_at
            FROM chart_user_settings
            WHERE user_id = ?
            """,
            (user_id,),
        ).fetchone()

    return ChartingBootstrapResponse(
        layouts=[_row_to_layout_summary(row) for row in layout_rows],
        settings=_row_to_settings(settings_row),
    )


def list_chart_layouts(user_id: int) -> list[ChartLayoutSummary]:
    return get_charting_bootstrap(user_id).layouts


def get_chart_layout(user_id: int, layout_id: int) -> ChartLayoutDocument:
    with _connect() as conn:
        _ensure_default_layout(conn, user_id)
        conn.commit()
        row = conn.execute(
            """
            SELECT id, name, symbol, interval, theme, is_default, payload_json, created_at, updated_at
            FROM chart_layouts
            WHERE user_id = ? AND id = ?
            """,
            (user_id, layout_id),
        ).fetchone()

    if row is None:
        raise ValueError("Chart layout not found.")

    return _row_to_layout_document(row)


def create_chart_layout(user_id: int, payload: ChartLayoutCreateRequest) -> ChartLayoutDocument:
    name = _normalize_layout_name(payload.name)
    symbol = _normalize_symbol(payload.symbol)
    interval = _normalize_interval(payload.interval)
    theme = _normalize_theme(payload.theme)
    layout_payload = payload.payload.model_copy(
        update={"symbol": symbol, "interval": interval, "theme": theme}
    )
    now = _utc_now()

    with _connect() as conn:
        _ensure_default_layout(conn, user_id)
        if payload.is_default:
            conn.execute("UPDATE chart_layouts SET is_default = 0 WHERE user_id = ?", (user_id,))

        cursor = conn.execute(
            """
            INSERT INTO chart_layouts (
                user_id, name, symbol, interval, theme, is_default, payload_json, created_at, updated_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
            """,
            (
                user_id,
                name,
                symbol,
                interval,
                theme,
                int(payload.is_default),
                _payload_json(layout_payload),
                now,
                now,
            ),
        )
        layout_id = int(cursor.lastrowid)
        conn.commit()

    return get_chart_layout(user_id, layout_id)


def update_chart_layout(user_id: int, layout_id: int, payload: ChartLayoutUpdateRequest) -> ChartLayoutDocument:
    with _connect() as conn:
        current = conn.execute(
            """
            SELECT id, name, symbol, interval, theme, is_default, payload_json, created_at, updated_at
            FROM chart_layouts
            WHERE user_id = ? AND id = ?
            """,
            (user_id, layout_id),
        ).fetchone()
        if current is None:
            raise ValueError("Chart layout not found.")

        current_document = _row_to_layout_document(current)
        next_name = _normalize_layout_name(payload.name) if payload.name is not None else current_document.name
        next_symbol = _normalize_symbol(payload.symbol) if payload.symbol is not None else current_document.symbol
        next_interval = _normalize_interval(payload.interval) if payload.interval is not None else current_document.interval
        next_theme = _normalize_theme(payload.theme) if payload.theme is not None else current_document.theme
        next_is_default = payload.is_default if payload.is_default is not None else current_document.is_default
        next_payload = (
            payload.payload.model_copy(update={"symbol": next_symbol, "interval": next_interval, "theme": next_theme})
            if payload.payload is not None
            else current_document.payload.model_copy(update={"symbol": next_symbol, "interval": next_interval, "theme": next_theme})
        )

        if next_is_default:
            conn.execute("UPDATE chart_layouts SET is_default = 0 WHERE user_id = ?", (user_id,))

        conn.execute(
            """
            UPDATE chart_layouts
            SET name = ?, symbol = ?, interval = ?, theme = ?, is_default = ?, payload_json = ?, updated_at = ?
            WHERE user_id = ? AND id = ?
            """,
            (
                next_name,
                next_symbol,
                next_interval,
                next_theme,
                int(next_is_default),
                _payload_json(next_payload),
                _utc_now(),
                user_id,
                layout_id,
            ),
        )
        conn.commit()

    return get_chart_layout(user_id, layout_id)


def get_chart_user_settings(user_id: int) -> ChartUserSettings:
    with _connect() as conn:
        _ensure_settings(conn, user_id)
        conn.commit()
        row = conn.execute(
            """
            SELECT theme, favorite_intervals, favorite_indicators, watchlist_symbols,
                   last_symbol, last_interval, left_toolbar_open, right_sidebar_open, updated_at
            FROM chart_user_settings
            WHERE user_id = ?
            """,
            (user_id,),
        ).fetchone()

    return _row_to_settings(row)


def upsert_chart_user_settings(user_id: int, payload: ChartUserSettingsUpdateRequest) -> ChartUserSettings:
    current = get_chart_user_settings(user_id)

    next_settings = ChartUserSettings(
        theme=_normalize_theme(payload.theme) if payload.theme is not None else current.theme,
        favorite_intervals=payload.favorite_intervals or current.favorite_intervals,
        favorite_indicators=payload.favorite_indicators or current.favorite_indicators,
        watchlist_symbols=[_normalize_symbol(symbol) for symbol in (payload.watchlist_symbols or current.watchlist_symbols)],
        last_symbol=_normalize_symbol(payload.last_symbol) if payload.last_symbol is not None else current.last_symbol,
        last_interval=_normalize_interval(payload.last_interval) if payload.last_interval is not None else current.last_interval,
        left_toolbar_open=payload.left_toolbar_open if payload.left_toolbar_open is not None else current.left_toolbar_open,
        right_sidebar_open=payload.right_sidebar_open if payload.right_sidebar_open is not None else current.right_sidebar_open,
        updated_at=_utc_now(),
    )

    with _connect() as conn:
        _ensure_settings(conn, user_id)
        conn.execute(
            """
            UPDATE chart_user_settings
            SET theme = ?, favorite_intervals = ?, favorite_indicators = ?, watchlist_symbols = ?,
                last_symbol = ?, last_interval = ?, left_toolbar_open = ?, right_sidebar_open = ?, updated_at = ?
            WHERE user_id = ?
            """,
            (
                next_settings.theme,
                json.dumps(next_settings.favorite_intervals),
                json.dumps(next_settings.favorite_indicators),
                json.dumps(next_settings.watchlist_symbols),
                next_settings.last_symbol,
                next_settings.last_interval,
                int(next_settings.left_toolbar_open),
                int(next_settings.right_sidebar_open),
                next_settings.updated_at,
                user_id,
            ),
        )
        conn.commit()

    return next_settings
