from __future__ import annotations

from pydantic import BaseModel


class AuthUser(BaseModel):
    id: int
    email: str
    name: str
    role: str
    created_at: str


class AuthRegisterRequest(BaseModel):
    name: str
    email: str
    password: str


class AuthLoginRequest(BaseModel):
    email: str
    password: str


class AuthSessionResponse(BaseModel):
    token: str
    user: AuthUser
