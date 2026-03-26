from __future__ import annotations

import base64
import hashlib
import hmac
import re
import secrets
import sqlite3
from datetime import datetime, timezone

from app.core.config import settings
from app.models.auth import AuthSessionResponse, AuthUser


DB_PATH = settings.resolve_data_path(settings.auth_db_path)


def _connect() -> sqlite3.Connection:
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn


def _utc_now() -> str:
    return datetime.now(timezone.utc).isoformat()


def init_auth_db() -> None:
    with _connect() as conn:
        conn.execute(
            """
            CREATE TABLE IF NOT EXISTS users (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                email TEXT NOT NULL UNIQUE,
                name TEXT NOT NULL,
                password_hash TEXT NOT NULL,
                password_salt TEXT NOT NULL,
                role TEXT NOT NULL DEFAULT 'user',
                created_at TEXT NOT NULL
            )
            """
        )
        conn.execute(
            """
            CREATE TABLE IF NOT EXISTS sessions (
                token TEXT PRIMARY KEY,
                user_id INTEGER NOT NULL,
                created_at TEXT NOT NULL,
                FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
            )
            """
        )
        conn.commit()


def _normalize_email(email: str) -> str:
    return email.strip().lower()


def _validate_email(email: str) -> None:
    normalized = _normalize_email(email)
    if not re.match(r"^[^@\s]+@[^@\s]+\.[^@\s]+$", normalized):
        raise ValueError("Enter a valid email address.")


def _validate_password(password: str) -> None:
    if len(password) < 8:
        raise ValueError("Password must be at least 8 characters long.")


def _validate_name(name: str) -> None:
    if len(name.strip()) < 2:
        raise ValueError("Enter your full name.")


def _hash_password(password: str, salt: str) -> str:
    digest = hashlib.pbkdf2_hmac(
        "sha256",
        password.encode("utf-8"),
        base64.b64decode(salt.encode("utf-8")),
        120000,
    )
    return base64.b64encode(digest).decode("utf-8")


def _create_password_fields(password: str) -> tuple[str, str]:
    salt = base64.b64encode(secrets.token_bytes(16)).decode("utf-8")
    password_hash = _hash_password(password, salt)
    return password_hash, salt


def _verify_password(password: str, password_hash: str, password_salt: str) -> bool:
    attempt = _hash_password(password, password_salt)
    return hmac.compare_digest(attempt, password_hash)


def _row_to_user(row: sqlite3.Row) -> AuthUser:
    return AuthUser(
        id=int(row["id"]),
        email=str(row["email"]),
        name=str(row["name"]),
        role=str(row["role"]),
        created_at=str(row["created_at"]),
    )


def register_user(name: str, email: str, password: str) -> AuthSessionResponse:
    _validate_name(name)
    _validate_email(email)
    _validate_password(password)

    normalized_email = _normalize_email(email)
    password_hash, password_salt = _create_password_fields(password)
    created_at = _utc_now()
    token = secrets.token_urlsafe(32)

    with _connect() as conn:
        existing = conn.execute(
            "SELECT id FROM users WHERE email = ?",
            (normalized_email,),
        ).fetchone()
        if existing:
            raise ValueError("An account with that email already exists.")

        cursor = conn.execute(
            """
            INSERT INTO users (email, name, password_hash, password_salt, role, created_at)
            VALUES (?, ?, ?, ?, 'user', ?)
            """,
            (normalized_email, name.strip(), password_hash, password_salt, created_at),
        )
        user_id = int(cursor.lastrowid)
        conn.execute(
            """
            INSERT INTO sessions (token, user_id, created_at)
            VALUES (?, ?, ?)
            """,
            (token, user_id, created_at),
        )
        row = conn.execute(
            """
            SELECT id, email, name, role, created_at
            FROM users
            WHERE id = ?
            """,
            (user_id,),
        ).fetchone()
        conn.commit()

    if row is None:
        raise ValueError("Failed to create account.")

    return AuthSessionResponse(token=token, user=_row_to_user(row))


def login_user(email: str, password: str) -> AuthSessionResponse:
    normalized_email = _normalize_email(email)

    with _connect() as conn:
        row = conn.execute(
            """
            SELECT id, email, name, role, created_at, password_hash, password_salt
            FROM users
            WHERE email = ?
            """,
            (normalized_email,),
        ).fetchone()
        if row is None or not _verify_password(password, row["password_hash"], row["password_salt"]):
            raise ValueError("Invalid email or password.")

        token = secrets.token_urlsafe(32)
        conn.execute(
            """
            INSERT INTO sessions (token, user_id, created_at)
            VALUES (?, ?, ?)
            """,
            (token, int(row["id"]), _utc_now()),
        )
        conn.commit()

    return AuthSessionResponse(token=token, user=_row_to_user(row))


def get_user_for_token(token: str) -> AuthUser | None:
    if not token:
        return None

    with _connect() as conn:
        row = conn.execute(
            """
            SELECT u.id, u.email, u.name, u.role, u.created_at
            FROM sessions s
            JOIN users u ON u.id = s.user_id
            WHERE s.token = ?
            """,
            (token,),
        ).fetchone()

    if row is None:
        return None

    return _row_to_user(row)


def logout_token(token: str) -> None:
    if not token:
        return

    with _connect() as conn:
        conn.execute("DELETE FROM sessions WHERE token = ?", (token,))
        conn.commit()
