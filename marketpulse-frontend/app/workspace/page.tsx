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
        <div className="frame-shell w-full max-w-[520px] px-6 py-8 text-center">
          <div className="eyebrow">Secure Workspace</div>
          <div className="mt-3 text-3xl font-semibold text-white">Loading access...</div>
          <div className="mt-3 text-sm leading-7 text-[var(--text-soft)]">
            Validating your session before opening the Unveni workspace.
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="app-shell min-h-screen px-3 py-3 lg:px-4 lg:py-4">
      <div className="mx-auto max-w-[1880px] space-y-3">
        <header className="command-shell reveal-up sticky top-2 z-30 overflow-hidden px-4 py-4 sm:top-3 lg:px-5">
          <div className="flex flex-col gap-4">
            <div className="flex flex-col gap-4 2xl:flex-row 2xl:items-center">
              <div className="flex min-w-0 flex-col gap-3 xl:flex-row xl:items-center 2xl:min-w-[420px]">
                <BrandLockup />

                <div className="overflow-x-auto pb-1 xl:pb-0">
                  <div className="segmented-shell min-w-max">
                    {(["desk", "research", "workflow"] as SurfaceMode[]).map((item) => (
                      <button
                        key={item}
                        type="button"
                        className={`surface-tab ${activeSurface === item ? "surface-tab-active" : ""}`}
                        onClick={() => focusSurface(item)}
                      >
                        {item === "desk"
                          ? "Markets"
                          : item === "research"
                            ? "Research"
                            : "Workspace"}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <form
                className="flex min-w-0 flex-1 flex-col gap-2 sm:flex-row"
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
                  placeholder="Search ticker, memo, watchlist, or workspace"
                />
                <button className="action-button min-w-[92px] sm:w-auto" type="submit">
                  Open
                </button>
              </form>

              <div className="flex flex-wrap items-center gap-3 sm:justify-between 2xl:justify-end">
                <div className="segmented-shell">
                  <button
                    className={`segmented-button ${
                      horizon === "short_term" ? "segmented-button-active" : ""
                    }`}
                    type="button"
                    onClick={() => setHorizon("short_term")}
                  >
                    Short-Term
                  </button>
                  <button
                    className={`segmented-button ${
                      horizon === "long_term" ? "segmented-button-active" : ""
                    }`}
                    type="button"
                    onClick={() => setHorizon("long_term")}
                  >
                    Long-Term
                  </button>
                </div>

                <div className="flex items-center gap-3">
                  <div className="hidden rounded-[18px] border border-white/8 bg-white/[0.03] px-4 py-3 text-right xl:block">
                    <div className="text-sm font-medium text-white">{session.user.name}</div>
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
                    {loggingOut ? "Signing out..." : "Logout"}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </header>

        <div className="grid gap-3 xl:grid-cols-[260px_minmax(0,1fr)] 2xl:grid-cols-[260px_minmax(0,1fr)_348px]">
          <div className="order-3 xl:order-1 xl:row-span-2">
            <TickerSidebar
              symbol={symbol}
              horizon={horizon}
              onSelect={(ticker) => setSymbol(ticker)}
              onAnalyze={(ticker) => setSymbol(ticker)}
            />
          </div>

          <div ref={deskRef} className="order-1 min-w-0 space-y-3 xl:order-2">
            {mergedAnalysis ? (
              <div className="frame-shell reveal-up overflow-hidden px-4 py-3 lg:px-5">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="desk-chip desk-chip-accent mono">{symbol}</span>
                  <span className="desk-chip mono">
                    {horizon === "short_term" ? "Short-term engine" : "Long-term engine"}
                  </span>
                  <span className="desk-chip mono">
                    Levels {technical?.support_level?.toFixed(2) ?? "n/a"} /{" "}
                    {technical?.resistance_level?.toFixed(2) ?? "n/a"}
                  </span>
                </div>
              </div>
            ) : null}

            {mergedAnalysis ? <MetricCards analysis={mergedAnalysis} horizon={horizon} /> : null}

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
          </div>

          <div ref={researchRef} className="order-2 min-w-0 xl:order-3 2xl:order-4">
            {mergedAnalysis ? <InsightPanels analysis={mergedAnalysis} horizon={horizon} /> : null}

            {(loadingAnalysis || loadingNews) && !error ? (
              <div className="frame-shell reveal-up reveal-delay-2 mt-3 px-4 py-3 text-sm text-cyan-100">
                {isAnalysisLoading(analysis)
                  ? "Building the active research stack and refreshing catalysts..."
                  : "Updating price, workflow, and news context..."}
              </div>
            ) : null}

            {error ? (
              <div className="frame-shell reveal-up reveal-delay-2 mt-3 border-rose-500/20 bg-rose-500/10 px-4 py-3 text-sm text-rose-200">
                {error}
              </div>
            ) : null}
          </div>

          <div ref={workflowRef} className="order-4 2xl:order-3 2xl:row-span-2">
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
  );
}
