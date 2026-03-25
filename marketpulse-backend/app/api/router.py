from fastapi import APIRouter
from app.api.routes import health, ticker, chart, news

api_router = APIRouter()
api_router.include_router(health.router, prefix="/health", tags=["health"])
api_router.include_router(ticker.router, prefix="/ticker", tags=["ticker"])
api_router.include_router(chart.router, prefix="/ticker", tags=["chart"])
api_router.include_router(news.router, prefix="/ticker", tags=["news"])