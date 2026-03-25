from datetime import datetime, time
from zoneinfo import ZoneInfo


def get_market_status() -> dict:
    eastern = ZoneInfo("America/New_York")
    now = datetime.now(eastern)

    open_time = time(9, 30)
    close_time = time(16, 0)

    if now.weekday() >= 5:
        return {"market_status": "WEEKEND", "timezone": "America/New_York"}

    if open_time <= now.time() <= close_time:
        return {"market_status": "OPEN", "timezone": "America/New_York"}

    return {"market_status": "CLOSED", "timezone": "America/New_York"}
