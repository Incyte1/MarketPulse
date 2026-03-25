from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.api.router import api_router
from app.core.config import settings
from app.services.cache_db import init_cache_db

app = FastAPI(
    title=settings.app_name,
    version="0.1.0",
    description="Backend API for MarketPulse",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "http://127.0.0.1:3000",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

init_cache_db()
app.include_router(api_router, prefix="/api")


@app.get("/")
def root():
    return {
        "message": "MarketPulse API is running",
        "docs": "/docs",
    }