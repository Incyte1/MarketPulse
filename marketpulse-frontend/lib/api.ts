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
  trend_short: string;
  trend_medium: string;
  price_vs_20d: string;
  price_vs_50d: string;
  distance_from_20d_percent: number;
  distance_from_50d_percent: number;
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
    throw new Error(text || `Request failed: ${res.status}`);
  }

  return res.json();
}

export async function fetchAnalysis(symbol: string, interval: string): Promise<AnalysisResponse> {
  return apiGet<AnalysisResponse>(
    `/api/ticker/${encodeURIComponent(symbol)}/summary?interval=${encodeURIComponent(interval)}`
  );
}

export async function fetchNews(symbol: string): Promise<NewsResponse> {
  return apiGet<NewsResponse>(
    `/api/ticker/${encodeURIComponent(symbol)}/news`
  );
}

export async function triggerRefresh(symbol: string, interval: string): Promise<void> {
  const res = await fetch(
    `${API_BASE}/api/ticker/${encodeURIComponent(symbol)}/refresh?interval=${encodeURIComponent(interval)}&range=1Y`,
    {
      method: "POST",
      cache: "no-store",
    }
  );

  if (!res.ok) {
    const text = await res.text();
    throw new Error(text || `Refresh failed: ${res.status}`);
  }
}