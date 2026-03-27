from __future__ import annotations

from fastapi import APIRouter, Depends, Header, HTTPException

from app.models.auth import AuthUser
from app.models.charting import (
    ChartLayoutCreateRequest,
    ChartLayoutDocument,
    ChartLayoutSummary,
    ChartLayoutUpdateRequest,
    ChartUserSettings,
    ChartUserSettingsUpdateRequest,
    ChartingBootstrapResponse,
)
from app.services.auth_service import get_user_for_token
from app.services.chart_layout_service import (
    create_chart_layout,
    get_chart_layout,
    get_chart_user_settings,
    get_charting_bootstrap,
    list_chart_layouts,
    upsert_chart_user_settings,
    update_chart_layout,
)

router = APIRouter()


def _bearer_token(authorization: str | None) -> str | None:
    if not authorization:
        return None

    prefix = "bearer "
    if authorization.lower().startswith(prefix):
        return authorization[len(prefix):].strip()
    return authorization.strip()


def _require_user(authorization: str | None = Header(default=None)) -> AuthUser:
    token = _bearer_token(authorization)
    user = get_user_for_token(token or "")
    if user is None:
        raise HTTPException(status_code=401, detail="Authentication required.")
    return user


def _raise_value_error(exc: ValueError) -> None:
    detail = str(exc)
    status_code = 404 if "not found" in detail.lower() else 400
    raise HTTPException(status_code=status_code, detail=detail)


@router.get("/bootstrap", response_model=ChartingBootstrapResponse)
def charting_bootstrap(user: AuthUser = Depends(_require_user)):
    return get_charting_bootstrap(user.id)


@router.get("/layouts", response_model=list[ChartLayoutSummary])
def charting_layouts(user: AuthUser = Depends(_require_user)):
    return list_chart_layouts(user.id)


@router.get("/layouts/{layout_id}", response_model=ChartLayoutDocument)
def charting_layout(layout_id: int, user: AuthUser = Depends(_require_user)):
    try:
        return get_chart_layout(user.id, layout_id)
    except ValueError as exc:
        _raise_value_error(exc)


@router.post("/layouts", response_model=ChartLayoutDocument)
def charting_create_layout(payload: ChartLayoutCreateRequest, user: AuthUser = Depends(_require_user)):
    try:
        return create_chart_layout(user.id, payload)
    except ValueError as exc:
        _raise_value_error(exc)


@router.put("/layouts/{layout_id}", response_model=ChartLayoutDocument)
def charting_update_layout(
    layout_id: int,
    payload: ChartLayoutUpdateRequest,
    user: AuthUser = Depends(_require_user),
):
    try:
        return update_chart_layout(user.id, layout_id, payload)
    except ValueError as exc:
        _raise_value_error(exc)


@router.get("/settings", response_model=ChartUserSettings)
def charting_settings(user: AuthUser = Depends(_require_user)):
    return get_chart_user_settings(user.id)


@router.put("/settings", response_model=ChartUserSettings)
def charting_upsert_settings(
    payload: ChartUserSettingsUpdateRequest,
    user: AuthUser = Depends(_require_user),
):
    try:
        return upsert_chart_user_settings(user.id, payload)
    except ValueError as exc:
        _raise_value_error(exc)
