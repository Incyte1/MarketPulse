from fastapi import APIRouter, HTTPException, Query
from app.models.chart import ChartResponse
from app.services.chart_service import get_chart_candles

router = APIRouter()


@router.get("/{symbol}/chart", response_model=ChartResponse)
def ticker_chart(
    symbol: str,
    interval: str = Query("1day", description="1min, 5min, 15min, 1h, 1day, 1week, 1month"),
    range: str = Query("1M", description="1D, 5D, 1M, 3M, 6M, 1Y, 5Y, Max"),
):
    symbol = symbol.upper().strip()

    try:
        candles = get_chart_candles(symbol=symbol, interval=interval, range_label=range)
        return ChartResponse(
            symbol=symbol,
            interval=interval,
            range=range,
            candles=candles,
        )
    except Exception as exc:
        raise HTTPException(status_code=400, detail=str(exc))
