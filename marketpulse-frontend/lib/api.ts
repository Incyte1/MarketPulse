const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://127.0.0.1:8000";

export type InterpretedArticle = {
  title: string;
  source?: string | null;
  published_at?: string | null;
  url?: string | null;

  article_type: string;
  relevance: string;
  direction: string;
  impact: string;
  explanation: string;
  mentioned_tickers: string[];

  importance?: string;
  time_horizon?: string;
  market_scope?: string;
  key_takeaway?: string;
  trade_relevance?: string;
  confirmation_to_watch?: string | null;
  invalidation_to_watch?: string | null;
  impact_area?: string[];
};

export type PriceContext = {
  current_price: number;
  previous_close: number;
  daily_change: number;
  daily_change_percent: number;
  trend_5d: string;
};

export type TechnicalContext = {
  analysis_timeframe: string;
  data_source_interval?: string;
  data_range?: string;
  calibration_window?: string;
  fast_indicator_label?: string;
  medium_indicator_label?: string;
  slow_indicator_label?: string;
  trend_short: string;
  trend_medium: string;
  price_vs_20d: string;
  price_vs_50d: string;
  price_vs_200d?: string;
  distance_from_20d_percent: number;
  distance_from_50d_percent: number;
  distance_from_200d_percent?: number;
  ema_20?: number;
  ema_50?: number;
  ema_200?: number;
  macd?: number;
  macd_signal?: number;
  macd_histogram?: number;
  stoch_rsi_k?: number;
  stoch_rsi_d?: number;
  support_level?: number;
  resistance_level?: number;
  support_basis?: string;
  resistance_basis?: string;
  vwap?: number;
  atr?: number;
  range_position_percent?: number;
  trend_score?: number;
  momentum_score?: number;
  level_score?: number;
  exhaustion_score?: number;
  volatility_state?: string;
  regime_state?: string;
  economic_pressure?: string;
  momentum_state: string;
  structure_score: number;
};

export type BiasInfo = {
  label: string;
  confidence_label: string;
  confidence_value: number;
  internal_score: number;
  total_score: number;
  news_score: number;
  technical_score: number;
  confirmation_score: number;
  bullish_count: number;
  bearish_count: number;
  neutral_count: number;
};

export type GuidanceInfo = {
  headline: string;
  summary: string;
  preferred_direction: string;
  warnings: string[];
};

export type ProfessionalAnalysis = {
  regime: string;
  primary_driver: string;
  secondary_drivers: string[];
  confirmation: string[];
  invalidation: string[];
  tactical_stance: string;
  key_risks: string[];
  executive_summary: string;
  plain_english_summary: string;
};

export type AnalysisResponse = {
  symbol: string;
  company_name: string;
  market_status: string;
  price_context: PriceContext;
  technical_context: TechnicalContext;
  bias: BiasInfo;
  guidance: GuidanceInfo;
  professional_analysis: ProfessionalAnalysis;
  interpreted_ticker_news: InterpretedArticle[];
  interpreted_macro_news: InterpretedArticle[];
};

export type NewsResponse = {
  symbol: string;
  ticker_news: InterpretedArticle[];
  macro_news: InterpretedArticle[];
};

async function apiGet<T>(path: string): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    cache: "no-store",
  });

  if (!res.ok) {
    const text = await res.text();
    let message = text;

    try {
      const parsed = JSON.parse(text) as { detail?: string };
      message = parsed.detail || text;
    } catch {
      message = text;
    }

    throw new Error(message || `Request failed: ${res.status}`);
  }

  return res.json();
}

export async function fetchAnalysis(symbol: string, interval: string): Promise<AnalysisResponse> {
  return apiGet<AnalysisResponse>(
    `/api/ticker/${encodeURIComponent(symbol)}/summary?interval=${encodeURIComponent(interval)}`
  );
}

export async function fetchNews(symbol: string, interval: string): Promise<NewsResponse> {
  return apiGet<NewsResponse>(
    `/api/ticker/${encodeURIComponent(symbol)}/news?interval=${encodeURIComponent(interval)}`
  );
}

export async function triggerRefresh(symbol: string, interval: string, range: string): Promise<void> {
  const res = await fetch(
    `${API_BASE}/api/ticker/${encodeURIComponent(symbol)}/refresh?interval=${encodeURIComponent(interval)}&range=${encodeURIComponent(range)}`,
    {
      method: "POST",
      cache: "no-store",
    }
  );

  if (!res.ok) {
    const text = await res.text();
    let message = text;

    try {
      const parsed = JSON.parse(text) as { detail?: string };
      message = parsed.detail || text;
    } catch {
      message = text;
    }

    throw new Error(message || `Refresh failed: ${res.status}`);
  }
}
