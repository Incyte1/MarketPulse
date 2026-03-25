from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    app_name: str = "MarketPulse API"
    app_env: str = "development"

    news_api_key: str = ""
    finnhub_api_key: str = ""
    twelve_data_api_key: str = ""
    openai_api_key: str = ""

    openai_news_model_primary: str = "gpt-5-mini"
    openai_news_model_fallback: str = "gpt-5.4"
    openai_enable_news_cache: bool = True
    openai_news_cache_db: str = "news_cache.db"
    openai_escalate_low_confidence: bool = False
    openai_relevance_min: str = "low"

    enable_scrape_fallback: bool = True
    scrape_timeout_seconds: int = 8

    fast_refresh_mode: bool = True
    ai_news_article_limit_ticker: int = 0
    ai_news_article_limit_macro: int = 0

    model_config = SettingsConfigDict(env_file=".env", extra="ignore")


settings = Settings()