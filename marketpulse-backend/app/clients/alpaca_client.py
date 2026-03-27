from __future__ import annotations

from typing import Any

import requests

from app.core.config import settings


def alpaca_is_configured() -> bool:
    return bool(settings.alpaca_api_key and settings.alpaca_api_secret)


def _headers() -> dict[str, str]:
    if not alpaca_is_configured():
        raise ValueError("Alpaca API credentials are not configured.")
    return {
        "APCA-API-KEY-ID": settings.alpaca_api_key,
        "APCA-API-SECRET-KEY": settings.alpaca_api_secret,
    }


def _request(path: str) -> Any:
    response = requests.get(
        f"{settings.alpaca_base_url.rstrip('/')}{path}",
        headers=_headers(),
        timeout=20,
    )
    response.raise_for_status()
    return response.json()


def fetch_alpaca_account() -> dict[str, Any]:
    data = _request("/v2/account")
    if not isinstance(data, dict):
        raise ValueError("Unexpected Alpaca account response.")
    return data


def fetch_alpaca_positions() -> list[dict[str, Any]]:
    data = _request("/v2/positions")
    if not isinstance(data, list):
        raise ValueError("Unexpected Alpaca positions response.")
    return data
