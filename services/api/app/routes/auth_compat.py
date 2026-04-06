from __future__ import annotations

import hashlib
import re
import secrets
from datetime import timedelta
from typing import Literal

from fastapi import APIRouter, Depends, Request, Response
from fastapi.responses import JSONResponse
from pydantic import BaseModel, Field

from app.config import settings
from app.db import DatabaseSession, get_db_session
from app.repositories.audit import AuditRepository
from app.repositories.session import SessionRepository
from app.services.session import (
    AuthenticatedSessionContext,
    lookup_authenticated_session_by_token,
    utc_now
)


router = APIRouter(tags=["auth-compat"])

EMAIL_LOCAL_ALLOWED = re.compile(r"[^a-z0-9._-]+")


class LegacyAuthLoginRequest(BaseModel):
    email: str = Field(min_length=3, max_length=320)
    password: str = Field(min_length=1, max_length=256)


class LegacyAuthUser(BaseModel):
    id: str
    email: str
    handle: str
    name: str
    entitlement: str
    execution_mode: Literal["paper", "live"]


class LegacyAuthLoginResponse(BaseModel):
    token: str
    user: LegacyAuthUser


def set_session_cookie(response: Response, token: str) -> None:
    response.set_cookie(
        key=settings.session_cookie_name,
        value=token,
        httponly=True,
        secure=settings.use_secure_cookies,
        samesite="lax",
        max_age=settings.session_ttl_hours * 60 * 60,
        path="/"
    )


def parse_bearer_token(request: Request) -> str | None:
    header = request.headers.get("authorization")
    if not header:
        return None

    scheme, _, value = header.partition(" ")
    if scheme.lower() != "bearer" or not value.strip():
        return None

    return value.strip()


def build_legacy_handle(email: str) -> str:
    normalized_email = email.strip().lower()
    local_part = normalized_email.partition("@")[0]
    sanitized_local = EMAIL_LOCAL_ALLOWED.sub("-", local_part).strip("._-")
    digest = hashlib.sha1(normalized_email.encode("utf-8")).hexdigest()[:8]
    prefix_limit = 32 - len(digest) - 1
    prefix = (sanitized_local or "user")[:prefix_limit].rstrip("._-")
    if not prefix or not prefix[0].isalnum():
        prefix = "user"
    return f"{prefix}-{digest}"


def build_display_name(email: str) -> str:
    local_part = email.strip().split("@", 1)[0]
    pieces = [piece for piece in re.split(r"[._+-]+", local_part) if piece]
    if not pieces:
        return "Unveni Operator"
    return " ".join(piece.capitalize() for piece in pieces)[:60]


def build_legacy_user(session_context: AuthenticatedSessionContext) -> LegacyAuthUser:
    email = (
        session_context.provider_subject
        if session_context.auth_provider == "local-email"
        else f"{session_context.handle}@local.invalid"
    )
    return LegacyAuthUser(
        id=session_context.user_id,
        email=email,
        handle=session_context.handle,
        name=session_context.display_name,
        entitlement=session_context.entitlement,
        execution_mode=session_context.execution_mode
    )


def build_error_response(message: str, status_code: int) -> JSONResponse:
    return JSONResponse(status_code=status_code, content={"detail": message})


def authenticate_legacy_password(password: str) -> JSONResponse | None:
    if settings.session_strategy == "external":
        return build_error_response(
            "Session creation is disabled until an external identity provider is connected.",
            503
        )

    if settings.local_login_requires_token and password != settings.local_auth_token:
        return build_error_response("The supplied password was rejected.", 401)

    return None


@router.post("/auth/login", response_model=LegacyAuthLoginResponse)
@router.post("/api/auth/login", response_model=LegacyAuthLoginResponse)
def legacy_login(
    payload: LegacyAuthLoginRequest,
    request: Request,
    response: Response,
    session: DatabaseSession = Depends(get_db_session)
) -> LegacyAuthLoginResponse | JSONResponse:
    auth_failure = authenticate_legacy_password(payload.password)
    if auth_failure:
        return auth_failure

    repository = SessionRepository(session)
    audit_repository = AuditRepository(session)
    normalized_email = payload.email.strip().lower()
    user = repository.upsert_local_user(
        handle=build_legacy_handle(normalized_email),
        display_name=build_display_name(normalized_email),
        entitlement=settings.default_entitlement,
        execution_mode=settings.default_execution_mode,
        auth_provider="local-email",
        provider_subject=normalized_email
    )

    raw_token = secrets.token_urlsafe(32)
    expires_at = utc_now() + timedelta(hours=settings.session_ttl_hours)
    created_session = repository.create_session(
        user_id=str(user["id"]),
        token_hash=hashlib.sha256(raw_token.encode("utf-8")).hexdigest(),
        expires_at=expires_at.isoformat(),
        ip_address=request.client.host if request.client else None,
        user_agent=request.headers.get("user-agent")
    )
    session_context = AuthenticatedSessionContext(
        session_id=str(created_session["session_id"]),
        user_id=str(created_session["user_id"]),
        handle=str(created_session["handle"]),
        display_name=str(created_session["display_name"]),
        entitlement=str(created_session["entitlement"]),
        execution_mode=str(created_session["execution_mode"]),  # type: ignore[arg-type]
        auth_provider=str(created_session["auth_provider"]),
        provider_subject=str(created_session["provider_subject"]),
        expires_at=expires_at,
        mode="development" if settings.session_strategy == "development" else "authenticated"
    )

    audit_repository.record_event(
        event_type="auth.session.created",
        user_id=session_context.user_id,
        session_id=session_context.session_id,
        entity_type="session",
        entity_id=session_context.session_id,
        payload={
            "handle": session_context.handle,
            "email": normalized_email,
            "session_strategy": settings.session_strategy,
            "source": "legacy_email_login"
        }
    )
    set_session_cookie(response, raw_token)
    return LegacyAuthLoginResponse(token=raw_token, user=build_legacy_user(session_context))


@router.get("/auth/me", response_model=LegacyAuthUser)
@router.get("/api/auth/me", response_model=LegacyAuthUser)
def legacy_me(
    request: Request,
    session: DatabaseSession = Depends(get_db_session)
) -> LegacyAuthUser | JSONResponse:
    session_context = lookup_authenticated_session_by_token(
        session,
        parse_bearer_token(request) or request.cookies.get(settings.session_cookie_name)
    )
    if session_context is None:
        return build_error_response("Unauthorized", 401)

    return build_legacy_user(session_context)
