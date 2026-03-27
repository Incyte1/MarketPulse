SYMBOL_PROFILE_MAP = {
    "SPY": {
        "company": "SPDR S&P 500 ETF Trust",
        "sector": "Broad Market",
        "subsector": "Large Cap Benchmark",
        "benchmark_symbol": "SPY",
        "sector_etf": "SPY",
    },
    "QQQ": {
        "company": "Invesco QQQ Trust",
        "sector": "Broad Market",
        "subsector": "Growth Benchmark",
        "benchmark_symbol": "QQQ",
        "sector_etf": "QQQ",
    },
    "IWM": {
        "company": "iShares Russell 2000 ETF",
        "sector": "Broad Market",
        "subsector": "Small Cap Benchmark",
        "benchmark_symbol": "IWM",
        "sector_etf": "IWM",
    },
    "AAPL": {
        "company": "Apple",
        "sector": "Technology",
        "subsector": "Consumer Electronics",
        "benchmark_symbol": "QQQ",
        "sector_etf": "XLK",
    },
    "NVDA": {
        "company": "NVIDIA",
        "sector": "Technology",
        "subsector": "Semiconductors",
        "benchmark_symbol": "QQQ",
        "sector_etf": "XLK",
    },
    "TSLA": {
        "company": "Tesla",
        "sector": "Consumer Discretionary",
        "subsector": "Automobiles",
        "benchmark_symbol": "QQQ",
        "sector_etf": "XLY",
    },
    "MSFT": {
        "company": "Microsoft",
        "sector": "Technology",
        "subsector": "Software",
        "benchmark_symbol": "QQQ",
        "sector_etf": "XLK",
    },
    "AMZN": {
        "company": "Amazon",
        "sector": "Consumer Discretionary",
        "subsector": "Internet Retail",
        "benchmark_symbol": "QQQ",
        "sector_etf": "XLY",
    },
    "META": {
        "company": "Meta Platforms",
        "sector": "Communication Services",
        "subsector": "Internet Content & Information",
        "benchmark_symbol": "QQQ",
        "sector_etf": "XLC",
    },
    "AMD": {
        "company": "Advanced Micro Devices",
        "sector": "Technology",
        "subsector": "Semiconductors",
        "benchmark_symbol": "QQQ",
        "sector_etf": "XLK",
    },
    "GOOGL": {
        "company": "Alphabet",
        "sector": "Communication Services",
        "subsector": "Internet Content & Information",
        "benchmark_symbol": "QQQ",
        "sector_etf": "XLC",
    },
    "GOOG": {
        "company": "Alphabet",
        "sector": "Communication Services",
        "subsector": "Internet Content & Information",
        "benchmark_symbol": "QQQ",
        "sector_etf": "XLC",
    },
    "NFLX": {
        "company": "Netflix",
        "sector": "Communication Services",
        "subsector": "Entertainment",
        "benchmark_symbol": "QQQ",
        "sector_etf": "XLC",
    },
    "MU": {
        "company": "Micron Technology",
        "sector": "Technology",
        "subsector": "Semiconductors",
        "benchmark_symbol": "QQQ",
        "sector_etf": "XLK",
    },
    "QCOM": {
        "company": "Qualcomm",
        "sector": "Technology",
        "subsector": "Semiconductors",
        "benchmark_symbol": "QQQ",
        "sector_etf": "XLK",
    },
    "INTC": {
        "company": "Intel",
        "sector": "Technology",
        "subsector": "Semiconductors",
        "benchmark_symbol": "QQQ",
        "sector_etf": "XLK",
    },
    "JPM": {
        "company": "JPMorgan Chase",
        "sector": "Financials",
        "subsector": "Banks",
        "benchmark_symbol": "SPY",
        "sector_etf": "XLF",
    },
    "BAC": {
        "company": "Bank of America",
        "sector": "Financials",
        "subsector": "Banks",
        "benchmark_symbol": "SPY",
        "sector_etf": "XLF",
    },
    "WMT": {
        "company": "Walmart",
        "sector": "Consumer Staples",
        "subsector": "Discount Stores",
        "benchmark_symbol": "SPY",
        "sector_etf": "XLP",
    },
    "NKE": {
        "company": "Nike",
        "sector": "Consumer Discretionary",
        "subsector": "Footwear & Apparel",
        "benchmark_symbol": "SPY",
        "sector_etf": "XLY",
    },
    "MCD": {
        "company": "McDonald's",
        "sector": "Consumer Discretionary",
        "subsector": "Restaurants",
        "benchmark_symbol": "SPY",
        "sector_etf": "XLY",
    },
    "SBUX": {
        "company": "Starbucks",
        "sector": "Consumer Discretionary",
        "subsector": "Restaurants",
        "benchmark_symbol": "SPY",
        "sector_etf": "XLY",
    },
}


def company_name(symbol: str) -> str:
    profile = SYMBOL_PROFILE_MAP.get(symbol.upper(), {})
    return profile.get("company", symbol.upper())


def symbol_profile(symbol: str) -> dict[str, str]:
    normalized = symbol.upper()
    profile = SYMBOL_PROFILE_MAP.get(normalized, {})
    benchmark_symbol = profile.get("benchmark_symbol", "SPY")
    sector_etf = profile.get("sector_etf", benchmark_symbol)

    return {
        "symbol": normalized,
        "company": profile.get("company", normalized),
        "sector": profile.get("sector", "Broad Market"),
        "subsector": profile.get("subsector", "General"),
        "benchmark_symbol": benchmark_symbol,
        "sector_etf": sector_etf,
    }


def normalize_range(range_label: str) -> str:
    valid = {"1D", "5D", "1M", "3M", "6M", "1Y", "5Y", "Max"}
    return range_label if range_label in valid else "1M"
