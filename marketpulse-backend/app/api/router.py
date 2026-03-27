from fastapi import APIRouter
from app.api.routes import auth, chart, charting, health, news, ticker, workspaces

api_router = APIRouter()
api_router.include_router(health.router, prefix="/health", tags=["health"])
api_router.include_router(auth.router, prefix="/auth", tags=["auth"])
api_router.include_router(workspaces.router, prefix="/workspaces", tags=["workspaces"])
api_router.include_router(ticker.router, prefix="/ticker", tags=["ticker"])
api_router.include_router(chart.router, prefix="/ticker", tags=["chart"])
api_router.include_router(news.router, prefix="/ticker", tags=["news"])
api_router.include_router(charting.router, prefix="/charting", tags=["charting"])
