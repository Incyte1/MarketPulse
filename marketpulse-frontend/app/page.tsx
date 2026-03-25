"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import ChartCard from "@/components/ChartCard";
import InsightPanels from "@/components/InsightPanels";
import MetricCards from "@/components/MetricCards";
import TickerSidebar from "@/components/TickerSidebar";
import {
  fetchAnalysis,
  fetchNews,
  triggerRefresh,
  type AnalysisResponse,
  type NewsResponse,
} from "@/lib/api";

const DEFAULT_SYMBOL = "SPY";

type HorizonMode = "short_term" | "long_term";

function isAnalysisLoading(data: AnalysisResponse | null): boolean {
  if (!data) return true;

  return (
    data?.bias?.label === "LOADING" ||
    data?.professional_analysis?.primary_driver === "building_cache" ||
    data?.market_status === "LOADING"
  );
}

function intervalForHorizon(mode: HorizonMode): string {
  return mode === "short_term" ? "15min" : "1day";
}

function rangeForHorizon(mode: HorizonMode): string {
  return mode === "short_term" ? "5D" : "6M";
}

export default function HomePage() {
  const [symbol, setSymbol] = useState(DEFAULT_SYMBOL);
  const [horizon, setHorizon] = useState<HorizonMode>("short_term");
  const [analysis, setAnalysis] = useState<AnalysisResponse | null>(null);
  const [news, setNews] = useState<NewsResponse | null>(null);

  const [loadingAnalysis, setLoadingAnalysis] = useState(false);
  const [loadingNews, setLoadingNews] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const summaryPollRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const newsPollRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const refreshPollRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const interval = useMemo(() => intervalForHorizon(horizon), [horizon]);
  const range = useMemo(() => rangeForHorizon(horizon), [horizon]);

  function clearTimer(ref: React.MutableRefObject<ReturnType<typeof setTimeout> | null>) {
    if (ref.current) {
      clearTimeout(ref.current);
      ref.current = null;
    }
  }

  function clearAllTimers() {
    clearTimer(summaryPollRef);
    clearTimer(newsPollRef);
    clearTimer(refreshPollRef);
  }

  async function loadSummary(nextSymbol: string, nextInterval: string) {
    try {
      setLoadingAnalysis(true);
      const data = await fetchAnalysis(nextSymbol, nextInterval);
      setAnalysis(data);
      return data;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load analysis");
      return null;
    } finally {
      setLoadingAnalysis(false);
    }
  }

  async function loadNews(nextSymbol: string) {
    try {
      setLoadingNews(true);
      const data = await fetchNews(nextSymbol);
      setNews(data);
      return data;
    } catch (err) {
      console.error("Failed to load news", err);
      return null;
    } finally {
      setLoadingNews(false);
    }
  }

  useEffect(() => {
    let cancelled = false;
    setError(null);
    clearAllTimers();

    const activeSymbol = symbol;
    const activeInterval = interval;

    const start = async () => {
      triggerRefresh(activeSymbol, activeInterval).catch((err) => {
        console.error("Initial refresh trigger failed", err);
      });

      await loadNews(activeSymbol);
      const firstSummary = await loadSummary(activeSymbol, activeInterval);
      if (cancelled) return;

      const pollSummary = async () => {
        if (cancelled) return;

        const updated = await loadSummary(activeSymbol, activeInterval);
        if (cancelled) return;

        const stillLoading = isAnalysisLoading(updated);
        summaryPollRef.current = setTimeout(
          pollSummary,
          stillLoading ? 3000 : 20000
        );
      };

      const pollNews = async () => {
        if (cancelled) return;
        await loadNews(activeSymbol);
        if (cancelled) return;
        newsPollRef.current = setTimeout(pollNews, 45000);
      };

      const pollRefresh = async () => {
        if (cancelled) return;
        await triggerRefresh(activeSymbol, activeInterval).catch((err) => {
          console.error("Background refresh trigger failed", err);
        });
        if (cancelled) return;
        refreshPollRef.current = setTimeout(pollRefresh, 60000);
      };

      summaryPollRef.current = setTimeout(
        pollSummary,
        isAnalysisLoading(firstSummary) ? 3000 : 20000
      );
      newsPollRef.current = setTimeout(pollNews, 45000);
      refreshPollRef.current = setTimeout(pollRefresh, 60000);
    };

    start();

    return () => {
      cancelled = true;
      clearAllTimers();
    };
  }, [symbol, interval]);

  const activePrice = analysis?.price_context?.current_price ?? 0;
  const activeChange = analysis?.price_context?.daily_change_percent ?? 0;

  const mergedAnalysis =
    analysis == null
      ? null
      : {
          ...analysis,
          interpreted_ticker_news:
            news?.ticker_news?.length
              ? news.ticker_news
              : analysis.interpreted_ticker_news ?? [],
          interpreted_macro_news:
            news?.macro_news?.length
              ? news.macro_news
              : analysis.interpreted_macro_news ?? [],
        };

  return (
    <div className="min-h-screen bg-[#070b14] text-white">
      <div className="flex min-h-screen">
        <TickerSidebar
          symbol={symbol}
          onSelect={(t) => setSymbol(t)}
          onAnalyze={(t) => setSymbol(t)}
        />

        <main className="flex-1 p-6">
          <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
            <div>
              <h1 className="text-4xl font-bold tracking-tight">MarketPulse</h1>
              <p className="mt-2 text-sm text-slate-400">
                Clarity before every trade.
              </p>

              <div className="mt-4 inline-flex rounded-2xl border border-white/10 bg-[#0b1323] p-1">
                <button
                  className={`rounded-xl px-4 py-2 text-sm ${
                    horizon === "short_term"
                      ? "bg-emerald-500 text-black"
                      : "text-slate-300"
                  }`}
                  onClick={() => setHorizon("short_term")}
                >
                  Short-Term
                </button>
                <button
                  className={`rounded-xl px-4 py-2 text-sm ${
                    horizon === "long_term"
                      ? "bg-white text-black"
                      : "text-slate-300"
                  }`}
                  onClick={() => setHorizon("long_term")}
                >
                  Long-Term
                </button>
              </div>

              <div className="mt-2 text-xs text-slate-500">
                {horizon === "short_term"
                  ? "Short-Term uses faster market context for entries, momentum, and near-term reaction."
                  : "Long-Term uses a slower read focused on trend, structure, and broader positioning."}
              </div>
            </div>

            {analysis ? (
              <div className="text-right">
                <div className="text-3xl font-bold">{analysis.symbol}</div>
                <div className="mt-1 text-lg text-slate-300">{analysis.company_name}</div>
                <div className="mt-2 text-sm">
                  <span className="text-white">${activePrice.toFixed(2)}</span>
                  <span
                    className={`ml-2 ${
                      activeChange >= 0 ? "text-emerald-400" : "text-rose-400"
                    }`}
                  >
                    {activeChange >= 0 ? "+" : ""}
                    {activeChange.toFixed(2)}%
                  </span>
                </div>
              </div>
            ) : null}
          </div>

          {mergedAnalysis ? (
            <MetricCards analysis={mergedAnalysis} horizon={horizon} />
          ) : null}

          <div className="mt-6">
            <ChartCard
              symbol={symbol}
              interval={interval}
              range={range}
              candles={[]}
              loading={loadingAnalysis}
            />
          </div>

          <div className="mt-6">
            {mergedAnalysis ? (
              <InsightPanels analysis={mergedAnalysis} horizon={horizon} />
            ) : null}
          </div>

          {(loadingAnalysis || loadingNews) && !error ? (
            <div className="mt-6 rounded-2xl border border-cyan-500/20 bg-cyan-500/10 p-4 text-sm text-cyan-100">
              {isAnalysisLoading(analysis)
                ? "Building analysis and refreshing catalysts..."
                : "Updating market data..."}
            </div>
          ) : null}

          {error ? (
            <div className="mt-6 rounded-2xl border border-rose-500/20 bg-rose-500/10 p-4 text-sm text-rose-200">
              {error}
            </div>
          ) : null}
        </main>
      </div>
    </div>
  );
}