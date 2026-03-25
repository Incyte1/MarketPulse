from __future__ import annotations

from typing import List

from pydantic import BaseModel, Field

from app.models.ticker import InterpretedArticle


class NewsResponse(BaseModel):
    symbol: str
    ticker_news: List[InterpretedArticle] = Field(default_factory=list)
    macro_news: List[InterpretedArticle] = Field(default_factory=list)