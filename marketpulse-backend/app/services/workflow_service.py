from __future__ import annotations

import json
import sqlite3
from datetime import datetime, timezone

from app.core.config import settings
from app.models.workflow import (
    AlertItem,
    InvestmentMemo,
    MemoSourceLink,
    WorkspaceDetailResponse,
    WorkspaceSummary,
    WatchlistItem,
)

DB_PATH = settings.resolve_data_path(settings.auth_db_path)


def _connect() -> sqlite3.Connection:
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA foreign_keys = ON")
    return conn


def _utc_now() -> str:
    return datetime.now(timezone.utc).isoformat()


def init_workflow_db() -> None:
    with _connect() as conn:
        conn.execute(
            """
            CREATE TABLE IF NOT EXISTS workspaces (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id INTEGER NOT NULL,
                name TEXT NOT NULL,
                description TEXT NOT NULL DEFAULT '',
                is_default INTEGER NOT NULL DEFAULT 0,
                selected_symbol TEXT NOT NULL DEFAULT 'SPY',
                selected_horizon TEXT NOT NULL DEFAULT 'short_term',
                created_at TEXT NOT NULL,
                updated_at TEXT NOT NULL,
                FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
            )
            """
        )
        conn.execute(
            """
            CREATE TABLE IF NOT EXISTS workspace_watchlist (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                workspace_id INTEGER NOT NULL,
                symbol TEXT NOT NULL,
                notes TEXT NOT NULL DEFAULT '',
                sort_order INTEGER NOT NULL DEFAULT 0,
                created_at TEXT NOT NULL,
                UNIQUE(workspace_id, symbol),
                FOREIGN KEY(workspace_id) REFERENCES workspaces(id) ON DELETE CASCADE
            )
            """
        )
        conn.execute(
            """
            CREATE TABLE IF NOT EXISTS workspace_alerts (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                workspace_id INTEGER NOT NULL,
                symbol TEXT NOT NULL,
                horizon TEXT NOT NULL,
                rule_type TEXT NOT NULL,
                level REAL NOT NULL,
                status TEXT NOT NULL DEFAULT 'active',
                note TEXT NOT NULL DEFAULT '',
                created_at TEXT NOT NULL,
                FOREIGN KEY(workspace_id) REFERENCES workspaces(id) ON DELETE CASCADE
            )
            """
        )
        conn.execute(
            """
            CREATE TABLE IF NOT EXISTS workspace_memos (
                workspace_id INTEGER PRIMARY KEY,
                thesis TEXT NOT NULL DEFAULT '',
                setup TEXT NOT NULL DEFAULT '',
                risks TEXT NOT NULL DEFAULT '',
                invalidation TEXT NOT NULL DEFAULT '',
                execution_plan TEXT NOT NULL DEFAULT '',
                source_links TEXT NOT NULL DEFAULT '[]',
                updated_at TEXT NOT NULL,
                FOREIGN KEY(workspace_id) REFERENCES workspaces(id) ON DELETE CASCADE
            )
            """
        )
        conn.commit()


def _row_to_workspace_summary(row: sqlite3.Row) -> WorkspaceSummary:
    return WorkspaceSummary(
        id=int(row["id"]),
        name=str(row["name"]),
        description=str(row["description"] or ""),
        is_default=bool(row["is_default"]),
        selected_symbol=str(row["selected_symbol"]),
        selected_horizon=str(row["selected_horizon"]),
        watchlist_count=int(row["watchlist_count"] or 0),
        alert_count=int(row["alert_count"] or 0),
        updated_at=str(row["updated_at"]),
    )


def _row_to_watchlist_item(row: sqlite3.Row) -> WatchlistItem:
    return WatchlistItem(
        id=int(row["id"]),
        symbol=str(row["symbol"]),
        notes=str(row["notes"] or ""),
        sort_order=int(row["sort_order"] or 0),
        created_at=str(row["created_at"]),
    )


def _row_to_alert_item(row: sqlite3.Row) -> AlertItem:
    return AlertItem(
        id=int(row["id"]),
        symbol=str(row["symbol"]),
        horizon=str(row["horizon"]),
        rule_type=str(row["rule_type"]),
        level=float(row["level"]),
        status=str(row["status"]),
        note=str(row["note"] or ""),
        created_at=str(row["created_at"]),
    )


def _row_to_memo(row: sqlite3.Row | None) -> InvestmentMemo:
    if row is None:
        return InvestmentMemo()

    links_raw = row["source_links"] or "[]"
    try:
        links_payload = json.loads(links_raw)
    except json.JSONDecodeError:
        links_payload = []

    return InvestmentMemo(
        thesis=str(row["thesis"] or ""),
        setup=str(row["setup"] or ""),
        risks=str(row["risks"] or ""),
        invalidation=str(row["invalidation"] or ""),
        execution_plan=str(row["execution_plan"] or ""),
        source_links=[MemoSourceLink(**item) for item in links_payload],
        updated_at=str(row["updated_at"] or ""),
    )


def _normalize_symbol(symbol: str) -> str:
    normalized = symbol.strip().upper()
    if not normalized:
        raise ValueError("Symbol is required.")
    return normalized


def _normalize_horizon(value: str) -> str:
    normalized = value.strip().lower()
    if normalized not in {"short_term", "long_term"}:
        raise ValueError("Horizon must be short_term or long_term.")
    return normalized


def _workspace_row(conn: sqlite3.Connection, user_id: int, workspace_id: int) -> sqlite3.Row | None:
    return conn.execute(
        """
        SELECT
            w.id,
            w.name,
            w.description,
            w.is_default,
            w.selected_symbol,
            w.selected_horizon,
            w.updated_at,
            COUNT(DISTINCT ww.id) AS watchlist_count,
            COUNT(DISTINCT wa.id) AS alert_count
        FROM workspaces w
        LEFT JOIN workspace_watchlist ww ON ww.workspace_id = w.id
        LEFT JOIN workspace_alerts wa ON wa.workspace_id = w.id
        WHERE w.user_id = ? AND w.id = ?
        GROUP BY w.id
        """,
        (user_id, workspace_id),
    ).fetchone()


def _ensure_default_workspace(conn: sqlite3.Connection, user_id: int) -> int:
    existing = conn.execute(
        "SELECT id FROM workspaces WHERE user_id = ? ORDER BY is_default DESC, updated_at DESC LIMIT 1",
        (user_id,),
    ).fetchone()
    if existing:
        return int(existing["id"])

    now = _utc_now()
    cursor = conn.execute(
        """
        INSERT INTO workspaces (
            user_id, name, description, is_default, selected_symbol, selected_horizon, created_at, updated_at
        ) VALUES (?, ?, ?, 1, 'SPY', 'short_term', ?, ?)
        """,
        (
            user_id,
            "Primary Workspace",
            "Default desk for active market review.",
            now,
            now,
        ),
    )
    workspace_id = int(cursor.lastrowid)
    conn.execute(
        """
        INSERT INTO workspace_memos (
            workspace_id, thesis, setup, risks, invalidation, execution_plan, source_links, updated_at
        ) VALUES (?, '', '', '', '', '', '[]', ?)
        """,
        (workspace_id, now),
    )
    conn.commit()
    return workspace_id


def list_workspaces(user_id: int) -> list[WorkspaceSummary]:
    with _connect() as conn:
        _ensure_default_workspace(conn, user_id)
        rows = conn.execute(
            """
            SELECT
                w.id,
                w.name,
                w.description,
                w.is_default,
                w.selected_symbol,
                w.selected_horizon,
                w.updated_at,
                COUNT(DISTINCT ww.id) AS watchlist_count,
                COUNT(DISTINCT wa.id) AS alert_count
            FROM workspaces w
            LEFT JOIN workspace_watchlist ww ON ww.workspace_id = w.id
            LEFT JOIN workspace_alerts wa ON wa.workspace_id = w.id
            WHERE w.user_id = ?
            GROUP BY w.id
            ORDER BY w.is_default DESC, w.updated_at DESC
            """,
            (user_id,),
        ).fetchall()

    return [_row_to_workspace_summary(row) for row in rows]


def get_workspace_detail(user_id: int, workspace_id: int) -> WorkspaceDetailResponse:
    with _connect() as conn:
        _ensure_default_workspace(conn, user_id)
        workspace_row = _workspace_row(conn, user_id, workspace_id)
        if workspace_row is None:
            raise ValueError("Workspace not found.")

        watchlist_rows = conn.execute(
            """
            SELECT id, symbol, notes, sort_order, created_at
            FROM workspace_watchlist
            WHERE workspace_id = ?
            ORDER BY sort_order ASC, created_at ASC
            """,
            (workspace_id,),
        ).fetchall()

        alert_rows = conn.execute(
            """
            SELECT id, symbol, horizon, rule_type, level, status, note, created_at
            FROM workspace_alerts
            WHERE workspace_id = ?
            ORDER BY created_at DESC
            """,
            (workspace_id,),
        ).fetchall()

        memo_row = conn.execute(
            """
            SELECT thesis, setup, risks, invalidation, execution_plan, source_links, updated_at
            FROM workspace_memos
            WHERE workspace_id = ?
            """,
            (workspace_id,),
        ).fetchone()

    return WorkspaceDetailResponse(
        workspace=_row_to_workspace_summary(workspace_row),
        watchlist=[_row_to_watchlist_item(row) for row in watchlist_rows],
        alerts=[_row_to_alert_item(row) for row in alert_rows],
        memo=_row_to_memo(memo_row),
    )


def create_workspace(
    user_id: int,
    name: str,
    description: str = "",
    selected_symbol: str = "SPY",
    selected_horizon: str = "short_term",
) -> WorkspaceSummary:
    cleaned_name = name.strip()
    if len(cleaned_name) < 2:
        raise ValueError("Workspace name must be at least 2 characters.")

    symbol = _normalize_symbol(selected_symbol)
    horizon = _normalize_horizon(selected_horizon)
    now = _utc_now()

    with _connect() as conn:
        _ensure_default_workspace(conn, user_id)
        cursor = conn.execute(
            """
            INSERT INTO workspaces (
                user_id, name, description, is_default, selected_symbol, selected_horizon, created_at, updated_at
            ) VALUES (?, ?, ?, 0, ?, ?, ?, ?)
            """,
            (user_id, cleaned_name, description.strip(), symbol, horizon, now, now),
        )
        workspace_id = int(cursor.lastrowid)
        conn.execute(
            """
            INSERT INTO workspace_memos (
                workspace_id, thesis, setup, risks, invalidation, execution_plan, source_links, updated_at
            ) VALUES (?, '', '', '', '', '', '[]', ?)
            """,
            (workspace_id, now),
        )
        conn.commit()
        row = _workspace_row(conn, user_id, workspace_id)

    if row is None:
        raise ValueError("Failed to create workspace.")

    return _row_to_workspace_summary(row)


def update_workspace(
    user_id: int,
    workspace_id: int,
    name: str | None = None,
    description: str | None = None,
    selected_symbol: str | None = None,
    selected_horizon: str | None = None,
) -> WorkspaceSummary:
    with _connect() as conn:
        _ensure_default_workspace(conn, user_id)
        current = _workspace_row(conn, user_id, workspace_id)
        if current is None:
            raise ValueError("Workspace not found.")

        next_name = name.strip() if name is not None else str(current["name"])
        next_description = description.strip() if description is not None else str(current["description"] or "")
        next_symbol = _normalize_symbol(selected_symbol) if selected_symbol is not None else str(current["selected_symbol"])
        next_horizon = _normalize_horizon(selected_horizon) if selected_horizon is not None else str(current["selected_horizon"])

        if len(next_name) < 2:
            raise ValueError("Workspace name must be at least 2 characters.")

        conn.execute(
            """
            UPDATE workspaces
            SET name = ?, description = ?, selected_symbol = ?, selected_horizon = ?, updated_at = ?
            WHERE id = ? AND user_id = ?
            """,
            (next_name, next_description, next_symbol, next_horizon, _utc_now(), workspace_id, user_id),
        )
        conn.commit()
        row = _workspace_row(conn, user_id, workspace_id)

    if row is None:
        raise ValueError("Workspace not found.")

    return _row_to_workspace_summary(row)


def add_watchlist_symbol(user_id: int, workspace_id: int, symbol: str, notes: str = "") -> WorkspaceDetailResponse:
    normalized_symbol = _normalize_symbol(symbol)
    with _connect() as conn:
        _ensure_default_workspace(conn, user_id)
        if _workspace_row(conn, user_id, workspace_id) is None:
            raise ValueError("Workspace not found.")

        existing = conn.execute(
            "SELECT id FROM workspace_watchlist WHERE workspace_id = ? AND symbol = ?",
            (workspace_id, normalized_symbol),
        ).fetchone()
        if existing is None:
            max_sort = conn.execute(
                "SELECT COALESCE(MAX(sort_order), 0) AS max_sort FROM workspace_watchlist WHERE workspace_id = ?",
                (workspace_id,),
            ).fetchone()
            next_sort = int(max_sort["max_sort"] or 0) + 1
            conn.execute(
                """
                INSERT INTO workspace_watchlist (workspace_id, symbol, notes, sort_order, created_at)
                VALUES (?, ?, ?, ?, ?)
                """,
                (workspace_id, normalized_symbol, notes.strip(), next_sort, _utc_now()),
            )
        conn.execute(
            "UPDATE workspaces SET selected_symbol = ?, updated_at = ? WHERE id = ? AND user_id = ?",
            (normalized_symbol, _utc_now(), workspace_id, user_id),
        )
        conn.commit()

    return get_workspace_detail(user_id, workspace_id)


def remove_watchlist_symbol(user_id: int, workspace_id: int, symbol: str) -> WorkspaceDetailResponse:
    normalized_symbol = _normalize_symbol(symbol)
    with _connect() as conn:
        _ensure_default_workspace(conn, user_id)
        if _workspace_row(conn, user_id, workspace_id) is None:
            raise ValueError("Workspace not found.")
        conn.execute(
            "DELETE FROM workspace_watchlist WHERE workspace_id = ? AND symbol = ?",
            (workspace_id, normalized_symbol),
        )
        conn.execute(
            "UPDATE workspaces SET updated_at = ? WHERE id = ? AND user_id = ?",
            (_utc_now(), workspace_id, user_id),
        )
        conn.commit()

    return get_workspace_detail(user_id, workspace_id)


def create_alert(
    user_id: int,
    workspace_id: int,
    symbol: str,
    horizon: str,
    rule_type: str,
    level: float,
    note: str = "",
) -> WorkspaceDetailResponse:
    normalized_symbol = _normalize_symbol(symbol)
    normalized_horizon = _normalize_horizon(horizon)
    normalized_rule = rule_type.strip().lower()
    if normalized_rule not in {"breakout_above", "breakdown_below", "reclaim_vwap", "lose_support"}:
        raise ValueError("Unsupported alert rule.")

    with _connect() as conn:
        _ensure_default_workspace(conn, user_id)
        if _workspace_row(conn, user_id, workspace_id) is None:
            raise ValueError("Workspace not found.")
        conn.execute(
            """
            INSERT INTO workspace_alerts (
                workspace_id, symbol, horizon, rule_type, level, status, note, created_at
            ) VALUES (?, ?, ?, ?, ?, 'active', ?, ?)
            """,
            (workspace_id, normalized_symbol, normalized_horizon, normalized_rule, float(level), note.strip(), _utc_now()),
        )
        conn.execute(
            "UPDATE workspaces SET updated_at = ? WHERE id = ? AND user_id = ?",
            (_utc_now(), workspace_id, user_id),
        )
        conn.commit()

    return get_workspace_detail(user_id, workspace_id)


def delete_alert(user_id: int, workspace_id: int, alert_id: int) -> WorkspaceDetailResponse:
    with _connect() as conn:
        _ensure_default_workspace(conn, user_id)
        if _workspace_row(conn, user_id, workspace_id) is None:
            raise ValueError("Workspace not found.")
        conn.execute(
            "DELETE FROM workspace_alerts WHERE id = ? AND workspace_id = ?",
            (alert_id, workspace_id),
        )
        conn.execute(
            "UPDATE workspaces SET updated_at = ? WHERE id = ? AND user_id = ?",
            (_utc_now(), workspace_id, user_id),
        )
        conn.commit()

    return get_workspace_detail(user_id, workspace_id)


def upsert_memo(
    user_id: int,
    workspace_id: int,
    thesis: str,
    setup: str,
    risks: str,
    invalidation: str,
    execution_plan: str,
    source_links: list[MemoSourceLink],
) -> WorkspaceDetailResponse:
    payload = json.dumps([item.model_dump() for item in source_links])

    with _connect() as conn:
        _ensure_default_workspace(conn, user_id)
        if _workspace_row(conn, user_id, workspace_id) is None:
            raise ValueError("Workspace not found.")
        conn.execute(
            """
            INSERT INTO workspace_memos (
                workspace_id, thesis, setup, risks, invalidation, execution_plan, source_links, updated_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            ON CONFLICT(workspace_id) DO UPDATE SET
                thesis = excluded.thesis,
                setup = excluded.setup,
                risks = excluded.risks,
                invalidation = excluded.invalidation,
                execution_plan = excluded.execution_plan,
                source_links = excluded.source_links,
                updated_at = excluded.updated_at
            """,
            (
                workspace_id,
                thesis.strip(),
                setup.strip(),
                risks.strip(),
                invalidation.strip(),
                execution_plan.strip(),
                payload,
                _utc_now(),
            ),
        )
        conn.execute(
            "UPDATE workspaces SET updated_at = ? WHERE id = ? AND user_id = ?",
            (_utc_now(), workspace_id, user_id),
        )
        conn.commit()

    return get_workspace_detail(user_id, workspace_id)
