COMPANY_MAP = {
    "SPY": "SPDR S&P 500 ETF Trust",
    "QQQ": "Invesco QQQ Trust",
    "AAPL": "Apple",
    "NVDA": "NVIDIA",
    "TSLA": "Tesla",
    "MSFT": "Microsoft",
    "AMZN": "Amazon",
    "META": "Meta Platforms",
    "AMD": "Advanced Micro Devices",
    "GOOGL": "Alphabet",
    "GOOG": "Alphabet",
}


def company_name(symbol: str) -> str:
    return COMPANY_MAP.get(symbol.upper(), symbol.upper())


def normalize_range(range_label: str) -> str:
    valid = {"1D", "5D", "1M", "3M", "6M", "1Y", "5Y", "Max"}
    return range_label if range_label in valid else "1M"
