import requests
from app.core.config import settings
from app.utils.symbols import company_name


NEWS_DOMAINS = (
    "reuters.com,bloomberg.com,cnbc.com,marketwatch.com,"
    "finance.yahoo.com,wsj.com,barrons.com,investing.com"
)


def fetch_ticker_news(symbol: str) -> list[dict]:
    if not settings.news_api_key:
        raise ValueError("NEWS_API_KEY is missing")

    company = company_name(symbol)
    url = "https://newsapi.org/v2/everything"
    params = {
        "q": (
            f'"{symbol}" OR "{company}" OR '
            f'"{symbol} earnings" OR "{company} earnings" OR '
            f'"{symbol} guidance" OR "{company} guidance" OR '
            f'"{symbol} outlook" OR "{company} outlook"'
        ),
        "language": "en",
        "sortBy": "publishedAt",
        "pageSize": 12,
        "searchIn": "title,description",
        "domains": NEWS_DOMAINS,
        "apiKey": settings.news_api_key,
    }

    response = requests.get(url, params=params, timeout=30)
    response.raise_for_status()
    data = response.json()

    if data.get("status") != "ok":
        raise RuntimeError(f"NewsAPI ticker error: {data}")

    return data.get("articles", [])


def fetch_macro_news() -> list[dict]:
    if not settings.news_api_key:
        raise ValueError("NEWS_API_KEY is missing")

    url = "https://newsapi.org/v2/everything"
    params = {
        "q": (
            '"Federal Reserve" OR FOMC OR Powell OR inflation OR CPI OR PPI '
            'OR "interest rates" OR "Treasury yields" OR "bond yields" '
            'OR "stock market" OR Nasdaq OR "S&P 500"'
        ),
        "language": "en",
        "sortBy": "publishedAt",
        "pageSize": 8,
        "searchIn": "title,description",
        "domains": NEWS_DOMAINS,
        "apiKey": settings.news_api_key,
    }

    response = requests.get(url, params=params, timeout=30)
    response.raise_for_status()
    data = response.json()

    if data.get("status") != "ok":
        raise RuntimeError(f"NewsAPI macro error: {data}")

    return data.get("articles", [])
