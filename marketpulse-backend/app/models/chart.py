from pydantic import BaseModel
from typing import List


class Candle(BaseModel):
    datetime: str
    open: float
    high: float
    low: float
    close: float
    volume: float


class ChartResponse(BaseModel):
    symbol: str
    interval: str
    range: str
    candles: List[Candle]
