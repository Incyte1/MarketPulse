from __future__ import annotations

from fastapi import APIRouter, Depends, Header, HTTPException

from app.models.auth import AuthUser
from app.models.workflow import (
    AlertCreateRequest,
    MemoUpsertRequest,
    WorkspaceExecutionPreviewResponse,
    WorkspaceCreateRequest,
    WorkspaceDetailResponse,
    WorkspacePortfolioResponse,
    WorkspacePortfolioReportResponse,
    WorkspaceSummary,
    WorkspaceUpdateRequest,
    WatchlistAddRequest,
)
from app.services.portfolio_service import build_workspace_portfolio
from app.services.portfolio_report_service import (
    build_workspace_execution_preview,
    build_workspace_portfolio_report,
)
from app.services.auth_service import get_user_for_token
from app.services.workflow_service import (
    add_watchlist_symbol,
    create_alert,
    create_workspace,
    delete_alert,
    get_workspace_detail,
    list_workspaces,
    remove_watchlist_symbol,
    update_workspace,
    upsert_memo,
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


@router.get("", response_model=list[WorkspaceSummary])
def workspace_list(user: AuthUser = Depends(_require_user)):
    return list_workspaces(user.id)


@router.post("", response_model=WorkspaceSummary)
def workspace_create(payload: WorkspaceCreateRequest, user: AuthUser = Depends(_require_user)):
    try:
        return create_workspace(
            user_id=user.id,
            name=payload.name,
            description=payload.description,
            selected_symbol=payload.selected_symbol,
            selected_horizon=payload.selected_horizon,
        )
    except ValueError as exc:
        _raise_value_error(exc)


@router.get("/{workspace_id}", response_model=WorkspaceDetailResponse)
def workspace_detail(workspace_id: int, user: AuthUser = Depends(_require_user)):
    try:
        return get_workspace_detail(user.id, workspace_id)
    except ValueError as exc:
        _raise_value_error(exc)


@router.get("/{workspace_id}/portfolio", response_model=WorkspacePortfolioResponse)
def workspace_portfolio(workspace_id: int, user: AuthUser = Depends(_require_user)):
    try:
        return build_workspace_portfolio(user.id, workspace_id)
    except ValueError as exc:
        _raise_value_error(exc)


@router.get("/{workspace_id}/portfolio/report", response_model=WorkspacePortfolioReportResponse)
def workspace_portfolio_report(workspace_id: int, user: AuthUser = Depends(_require_user)):
    try:
        return build_workspace_portfolio_report(user.id, workspace_id)
    except ValueError as exc:
        _raise_value_error(exc)


@router.get("/{workspace_id}/portfolio/execution-preview", response_model=WorkspaceExecutionPreviewResponse)
def workspace_execution_preview(workspace_id: int, user: AuthUser = Depends(_require_user)):
    try:
        return build_workspace_execution_preview(user.id, workspace_id)
    except ValueError as exc:
        _raise_value_error(exc)


@router.patch("/{workspace_id}", response_model=WorkspaceSummary)
def workspace_patch(
    workspace_id: int,
    payload: WorkspaceUpdateRequest,
    user: AuthUser = Depends(_require_user),
):
    try:
        return update_workspace(
            user_id=user.id,
            workspace_id=workspace_id,
            name=payload.name,
            description=payload.description,
            selected_symbol=payload.selected_symbol,
            selected_horizon=payload.selected_horizon,
        )
    except ValueError as exc:
        _raise_value_error(exc)


@router.post("/{workspace_id}/watchlist", response_model=WorkspaceDetailResponse)
def workspace_add_watchlist(
    workspace_id: int,
    payload: WatchlistAddRequest,
    user: AuthUser = Depends(_require_user),
):
    try:
        return add_watchlist_symbol(
            user_id=user.id,
            workspace_id=workspace_id,
            symbol=payload.symbol,
            notes=payload.notes,
        )
    except ValueError as exc:
        _raise_value_error(exc)


@router.delete("/{workspace_id}/watchlist/{symbol}", response_model=WorkspaceDetailResponse)
def workspace_remove_watchlist(
    workspace_id: int,
    symbol: str,
    user: AuthUser = Depends(_require_user),
):
    try:
        return remove_watchlist_symbol(user.id, workspace_id, symbol)
    except ValueError as exc:
        _raise_value_error(exc)


@router.post("/{workspace_id}/alerts", response_model=WorkspaceDetailResponse)
def workspace_add_alert(
    workspace_id: int,
    payload: AlertCreateRequest,
    user: AuthUser = Depends(_require_user),
):
    try:
        return create_alert(
            user_id=user.id,
            workspace_id=workspace_id,
            symbol=payload.symbol,
            horizon=payload.horizon,
            rule_type=payload.rule_type,
            level=payload.level,
            note=payload.note,
        )
    except ValueError as exc:
        _raise_value_error(exc)


@router.delete("/{workspace_id}/alerts/{alert_id}", response_model=WorkspaceDetailResponse)
def workspace_remove_alert(
    workspace_id: int,
    alert_id: int,
    user: AuthUser = Depends(_require_user),
):
    try:
        return delete_alert(user.id, workspace_id, alert_id)
    except ValueError as exc:
        _raise_value_error(exc)


@router.put("/{workspace_id}/memo", response_model=WorkspaceDetailResponse)
def workspace_put_memo(
    workspace_id: int,
    payload: MemoUpsertRequest,
    user: AuthUser = Depends(_require_user),
):
    try:
        return upsert_memo(
            user_id=user.id,
            workspace_id=workspace_id,
            thesis=payload.thesis,
            setup=payload.setup,
            risks=payload.risks,
            invalidation=payload.invalidation,
            execution_plan=payload.execution_plan,
            source_links=payload.source_links,
        )
    except ValueError as exc:
        _raise_value_error(exc)
