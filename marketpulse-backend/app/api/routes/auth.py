from __future__ import annotations

from fastapi import APIRouter, Header, HTTPException

from app.models.auth import AuthLoginRequest, AuthRegisterRequest, AuthSessionResponse, AuthUser
from app.services.auth_service import get_user_for_token, login_user, logout_token, register_user

router = APIRouter()


def _bearer_token(authorization: str | None) -> str | None:
    if not authorization:
        return None

    prefix = "bearer "
    if authorization.lower().startswith(prefix):
        return authorization[len(prefix):].strip()
    return authorization.strip()


@router.post("/register", response_model=AuthSessionResponse)
def register(payload: AuthRegisterRequest):
    try:
        return register_user(payload.name, payload.email, payload.password)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc))


@router.post("/login", response_model=AuthSessionResponse)
def login(payload: AuthLoginRequest):
    try:
        return login_user(payload.email, payload.password)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc))


@router.get("/me", response_model=AuthUser)
def me(authorization: str | None = Header(default=None)):
    token = _bearer_token(authorization)
    user = get_user_for_token(token or "")
    if user is None:
        raise HTTPException(status_code=401, detail="Authentication required.")
    return user


@router.post("/logout")
def logout(authorization: str | None = Header(default=None)):
    token = _bearer_token(authorization)
    if not token:
        raise HTTPException(status_code=401, detail="Authentication required.")

    logout_token(token)
    return {"status": "ok"}
