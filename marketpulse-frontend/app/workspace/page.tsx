"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import BrandLockup from "@/components/BrandLockup";
import ChartCard from "@/components/ChartCard";
import InsightPanels from "@/components/InsightPanels";
import MetricCards from "@/components/MetricCards";
import TickerSidebar from "@/components/TickerSidebar";
import WorkspaceDock from "@/components/WorkspaceDock";
import {
  fetchAnalysis,
  fetchNews,
  triggerRefresh,
  type AnalysisResponse,
  type NewsResponse,
} from "@/lib/api";
import { logoutUser, restoreSession, type AuthSession } from "@/lib/auth";

const DEFAULT_SYMBOL = "SPY";

type HorizonMode = "short_term" | "long_term";
type SurfaceMode = "desk" | "research" | "workflow";
type TimerRef = React.MutableRefObject<ReturnType<typeof setTimeout> | null>;

function clearTimer(ref: TimerRef) {
  if (ref.current) {
    clearTimeout(ref.current);
    ref.current = null;
  }
}

function clearAllTimers(refs: TimerRef[]) {
  refs.forEach(clearTimer);
}

function isAnalysisLoading(data: AnalysisResponse | null): boolean {
  if (!data) return true;

  return (
    data.bias.label === "LOADING" ||
    data.professional_analysis.primary_driver === "building_cache" ||
    data.market_status === "LOADING"
  );
}

function intervalForHorizon(mode: HorizonMode): string {
  return mode === "short_term" ? "1day" : "1week";
}

function chartIntervalForHorizon(mode: HorizonMode): string {
  return mode === "short_term" ? "1h" : "1day";
}

function chartRangeForHorizon(mode: HorizonMode): string {
  return mode === "short_term" ? "1D" : "1W";
}

function formatSurfaceLabel(value: SurfaceMode) {
  if (value === "desk") return "Desk";
  if (value === "research") return "Research";
  return "Memory";
}

export default function WorkspacePage() {
  const router = useRouter();
  const [symbol, setSymbol] = useState(DEFAULT_SYMBOL);
  const [horizon, setHorizon] = useState<HorizonMode>("short_term");
  const [activeSurface, setActiveSurface] = useState<SurfaceMode>("desk");
  const [analysis, setAnalysis] = useState<AnalysisResponse | null>(null);
  const [news, setNews] = useState<NewsResponse | null>(null);
  const [session, setSession] = useState<AuthSession | null>(null);
  const [authReady, setAuthReady] = useState(false);
  const [quickOpen, setQuickOpen] = useState("");

  const [loadingAnalysis, setLoadingAnalysis] = useState(false);
  const [loadingNews, setLoadingNews] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const summaryPollRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const newsPollRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const refreshPollRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const deskRef = useRef<HTMLDivElement | null>(null);
  const researchRef = useRef<HTMLDivElement | null>(null);
  const workflowRef = useRef<HTMLDivElement | null>(null);

  const analysisInterval = useMemo(() => intervalForHorizon(horizon), [horizon]);
  const chartInterval = useMemo(() => chartIntervalForHorizon(horizon), [horizon]);
  const chartRange = useMemo(() => chartRangeForHorizon(horizon), [horizon]);

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

  async function loadNews(nextSymbol: string, nextInterval: string) {
    try {
      setLoadingNews(true);
      const data = await fetchNews(nextSymbol, nextInterval);
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
    let active = true;

    restoreSession()
      .then((nextSession) => {
        if (!active) return;
        setSession(nextSession);
        setAuthReady(true);
      })
      .catch(() => {
        if (!active) return;
        setSession(null);
        setAuthReady(true);
      });

    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (!authReady || session) return;
    router.replace("/login");
  }, [authReady, router, session]);

  useEffect(() => {
    if (!authReady || !session) return;

    let cancelled = false;
    setError(null);
    clearAllTimers([summaryPollRef, newsPollRef, refreshPollRef]);

    const activeSymbol = symbol;
    const activeInterval = analysisInterval;
    const activeRange = chartRange;

    const start = async () => {
      triggerRefresh(activeSymbol, activeInterval, activeRange).catch((err) => {
        console.error("Initial refresh trigger failed", err);
      });

      await loadNews(activeSymbol, activeInterval);
      const firstSummary = await loadSummary(activeSymbol, activeInterval);
      if (cancelled) return;

      const pollSummary = async () => {
        if (cancelled) return;

        const updated = await loadSummary(activeSymbol, activeInterval);
        if (cancelled) return;

        const stillLoading = isAnalysisLoading(updated);
        summaryPollRef.current = setTimeout(pollSummary, stillLoading ? 3000 : 20000);
      };

      const pollNews = async () => {
        if (cancelled) return;
        await loadNews(activeSymbol, activeInterval);
        if (cancelled) return;
        newsPollRef.current = setTimeout(pollNews, 45000);
      };

      const pollRefresh = async () => {
        if (cancelled) return;
        await triggerRefresh(activeSymbol, activeInterval, activeRange).catch((err) => {
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
      clearAllTimers([summaryPollRef, newsPollRef, refreshPollRef]);
    };
  }, [session, authReady, symbol, analysisInterval, chartRange]);

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

  const technical = mergedAnalysis?.technical_context;
  const price = mergedAnalysis?.price_context.current_price ?? 0;
  const change = mergedAnalysis?.price_context.daily_change_percent ?? 0;

  function focusSurface(next: SurfaceMode) {
    setActiveSurface(next);
    const mapping: Record<SurfaceMode, HTMLDivElement | null> = {
      desk: deskRef.current,
      research: researchRef.current,
      workflow: workflowRef.current,
    };

    mapping[next]?.scrollIntoView({
      behavior: "smooth",
      block: "start",
    });
  }

  if (!authReady || !session) {
    return (
      <div className="app-shell flex min-h-screen items-center justify-center px-4 py-6">
        <div className="frame-shell w-full max-w-[560px] px-6 py-8 text-center">
          <div className="eyebrow">Secure Workspace</div>
          <div className="mt-3 text-3xl font-semibold text-white">Opening the desk...</div>
          <div className="mt-3 text-sm leading-7 text-[var(--text-soft)]">
            Validating your session before loading the active trading workspace.
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="app-shell min-h-screen px-3 py-3 sm:px-4 sm:py-4 lg:px-6 lg:py-6">
      <div className="mx-auto max-w-[1900px] space-y-4">
        <header className="command-shell reveal-up px-4 py-4 sm:px-5 lg:px-6">
          <div className="flex flex-col gap-4">
            <div className="flex flex-col gap-4 2xl:flex-row 2xl:items-center 2xl:justify-between">
              <div className="flex min-w-0 flex-col gap-4 xl:flex-row xl:items-center xl:gap-6">
                <BrandLockup />

                <div className="segmented-shell max-w-max">
                  {(["desk", "research", "workflow"] as SurfaceMode[]).map((item) => (
                    <button
                      key={item}
                      type="button"
                      className={`surface-tab ${activeSurface === item ? "surface-tab-active" : ""}`}
                      onClick={() => focusSurface(item)}
                    >
                      {formatSurfaceLabel(item)}
                    </button>
                  ))}
                </div>
              </div>

              <form
                className="flex min-w-0 flex-1 flex-col gap-2 xl:max-w-[720px] xl:flex-row"
                onSubmit={(event) => {
                  event.preventDefault();
                  const value = quickOpen.trim().toUpperCase();
                  if (!value) return;
                  setSymbol(value);
                  setQuickOpen("");
                  focusSurface("desk");
                }}
              >
                <input
                  className="command-input"
                  value={quickOpen}
                  onChange={(event) => setQuickOpen(event.target.value.toUpperCase())}
                  placeholder="Jump to ticker, workspace, or memo context"
                />
                <button className="action-button min-w-[110px]" type="submit">
                  Open
                </button>
              </form>

              <div className="flex flex-wrap items-center gap-3">
                <div className="segmented-shell">
                  <button
                    className={`segmented-button ${
                      horizon === "short_term" ? "segmented-button-active" : ""
                    }`}
                    type="button"
                    onClick={() => setHorizon("short_term")}
                  >
                    Short Horizon
                  </button>
                  <button
                    className={`segmented-button ${
                      horizon === "long_term" ? "segmented-button-active" : ""
                    }`}
                    type="button"
                    onClick={() => setHorizon("long_term")}
                  >
                    Long Horizon
                  </button>
                </div>

                <div className="hidden rounded-[20px] border border-white/10 bg-white/[0.03] px-4 py-3 text-right xl:block">
                  <div className="text-sm font-semibold text-white">{session.user.name}</div>
                  <div className="mt-1 text-xs text-[var(--text-soft)]">{session.user.email}</div>
                </div>

                <button
                  className="action-button-secondary"
                  disabled={loggingOut}
                  onClick={async () => {
                    setLoggingOut(true);
                    await logoutUser();
                    setSession(null);
                    setLoggingOut(false);
                    router.replace("/login");
                  }}
                >
                  {loggingOut ? "Signing out..." : "Log out"}
                </button>
              </div>
            </div>

            <div className="grid gap-3 lg:grid-cols-4">
              <div className="metric-cell">
                <div className="eyebrow">Active Symbol</div>
                <div className="mt-3 text-2xl font-semibold text-white">{symbol}</div>
                <div className="mt-2 text-sm text-[var(--text-soft)]">
                  {mergedAnalysis?.company_name || "Loading company profile"}
                </div>
              </div>

              <div className="metric-cell">
                <div className="eyebrow">Price / Session</div>
                <div className="mt-3 text-2xl font-semibold text-white">
                  {mergedAnalysis ? `$${price.toFixed(2)}` : "Syncing"}
                </div>
                <div className={`mt-2 text-sm font-medium ${change >= 0 ? "signal-positive" : "signal-negative"}`}>
                  {mergedAnalysis ? `${change >= 0 ? "+" : ""}${change.toFixed(2)}%` : "Waiting on feed"}
                </div>
              </div>

              <div className="metric-cell">
                <div className="eyebrow">Bias / Regime</div>
                <div className="mt-3 text-lg font-semibold text-white">
                  {mergedAnalysis?.bias.label || "Loading"}
                </div>
                <div className="mt-2 text-sm text-[var(--text-soft)]">
                  {mergedAnalysis?.professional_analysis.regime?.replaceAll("_", " ") || "Context pending"}
                </div>
              </div>

              <div className="metric-cell">
                <div className="eyebrow">Structure</div>
                <div className="mt-3 text-lg font-semibold text-white">
                  {technical?.support_level != null && technical?.resistance_level != null
                    ? `${technical.support_level.toFixed(2)} / ${technical.resistance_level.toFixed(2)}`
                    : "Pending"}
                </div>
                <div className="mt-2 text-sm text-[var(--text-soft)]">
                  {technical?.volatility_state || "volatility pending"} |{" "}
                  {horizon === "short_term" ? "execution mode" : "thesis mode"}
                </div>
              </div>
            </div>
          </div>
        </header>

        <div className="grid gap-4 2xl:grid-cols-[270px_minmax(0,1.12fr)_390px]">
          <div className="order-2 2xl:order-1">
            <TickerSidebar
              symbol={symbol}
              horizon={horizon}
              onSelect={(ticker) => setSymbol(ticker)}
              onAnalyze={(ticker) => setSymbol(ticker)}
            />
          </div>

          <div ref={deskRef} className="order-1 min-w-0 space-y-4 2xl:order-2">
            <ChartCard
              key={`${symbol}-${horizon}`}
              symbol={symbol}
              interval={chartInterval}
              range={chartRange}
              candles={[]}
              analysis={mergedAnalysis}
              horizon={horizon}
              loading={loadingAnalysis}
            />

            {mergedAnalysis ? <MetricCards analysis={mergedAnalysis} horizon={horizon} /> : null}

            {(loadingAnalysis || loadingNews) && !error ? (
              <div className="frame-shell reveal-up reveal-delay-2 px-4 py-3 text-sm text-slate-200">
                {isAnalysisLoading(analysis)
                  ? "Building the active read, refreshing catalysts, and syncing the portfolio layer..."
                  : "Refreshing price, workflow, and news context..."}
              </div>
            ) : null}

            {error ? (
              <div className="frame-shell reveal-up reveal-delay-2 border-rose-500/20 bg-rose-500/10 px-4 py-3 text-sm text-rose-200">
                {error}
              </div>
            ) : null}
          </div>

          <div className="order-3 min-w-0 space-y-4 2xl:order-3">
            <div ref={researchRef}>
              {mergedAnalysis ? <InsightPanels analysis={mergedAnalysis} horizon={horizon} /> : null}
            </div>
            <div ref={workflowRef}>
              <WorkspaceDock
                session={session}
                symbol={symbol}
                horizon={horizon}
                analysis={mergedAnalysis}
                onActivateSymbol={setSymbol}
                onActivateHorizon={setHorizon}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
