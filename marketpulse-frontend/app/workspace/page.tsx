"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import ChartCard from "@/components/ChartCard";
import InsightPanels from "@/components/InsightPanels";
import WorkspaceDock from "@/components/WorkspaceDock";
import { brand } from "@/lib/brand";
import {
  fetchAnalysis,
  fetchNews,
  triggerRefresh,
  type AnalysisResponse,
  type NewsResponse,
} from "@/lib/api";
import { logoutUser, restoreSession, type AuthSession } from "@/lib/auth";

const DEFAULT_SYMBOL = "SPY";
const TRACKER_SYMBOLS = ["SPY", "QQQ", "NVDA", "MSFT", "AAPL", "META", "AMZN", "TSLA", "AMD", "PLTR"];

type HorizonMode = "short_term" | "long_term";
type SurfaceMode = "arena" | "operator" | "research";
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

function readable(value?: string | null) {
  return (value || "pending").replaceAll("_", " ");
}

function formatSurfaceLabel(value: SurfaceMode) {
  if (value === "arena") return "Arena";
  if (value === "operator") return "Ops";
  return "Research";
}

export default function WorkspacePage() {
  const router = useRouter();
  const [symbol, setSymbol] = useState(DEFAULT_SYMBOL);
  const [horizon, setHorizon] = useState<HorizonMode>("short_term");
  const [activeSurface, setActiveSurface] = useState<SurfaceMode>("arena");
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
  const arenaRef = useRef<HTMLDivElement | null>(null);
  const operatorRef = useRef<HTMLDivElement | null>(null);
  const researchRef = useRef<HTMLDivElement | null>(null);

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
  const warnings = mergedAnalysis?.guidance.warnings ?? [];
  const confirmations = mergedAnalysis?.professional_analysis.confirmation ?? [];
  const invalidations = mergedAnalysis?.professional_analysis.invalidation ?? [];
  const risks = mergedAnalysis?.professional_analysis.key_risks ?? [];

  const deskStats = [
    {
      label: "Spot",
      value: mergedAnalysis ? `$${price.toFixed(2)}` : "Syncing",
      note: mergedAnalysis
        ? `${change >= 0 ? "+" : ""}${change.toFixed(2)}% vs prior close`
        : "Waiting on feed",
      tone: change >= 0 ? "signal-positive" : "signal-negative",
    },
    {
      label: "Bias",
      value: mergedAnalysis?.bias.label || "Loading",
      note: mergedAnalysis
        ? `${mergedAnalysis.bias.internal_score}/${mergedAnalysis.bias.total_score} model score`
        : "Bias engine pending",
      tone: "signal-neutral",
    },
    {
      label: "Conviction",
      value: mergedAnalysis?.bias.confidence_label || "Pending",
      note: mergedAnalysis
        ? `${mergedAnalysis.bias.confidence_value}/100 confidence`
        : "Confidence unavailable",
      tone: "signal-neutral",
    },
    {
      label: "Structure",
      value:
        technical?.support_level != null && technical?.resistance_level != null
          ? `${technical.support_level.toFixed(2)} / ${technical.resistance_level.toFixed(2)}`
          : "Pending",
      note: `${technical?.volatility_state || "volatility pending"} | ${readable(technical?.momentum_state)}`,
      tone: "signal-neutral",
    },
    {
      label: "Driver",
      value: readable(mergedAnalysis?.professional_analysis.primary_driver),
      note:
        mergedAnalysis?.professional_analysis.secondary_drivers.length
          ? mergedAnalysis.professional_analysis.secondary_drivers.join(" | ")
          : "Secondary drivers will populate here",
      tone: "signal-neutral",
    },
    {
      label: "Regime",
      value: readable(mergedAnalysis?.professional_analysis.regime),
      note: mergedAnalysis?.market_status || "Market status pending",
      tone: "signal-neutral",
    },
  ];

  function focusSurface(next: SurfaceMode) {
    setActiveSurface(next);
    const mapping: Record<SurfaceMode, HTMLDivElement | null> = {
      arena: arenaRef.current,
      operator: operatorRef.current,
      research: researchRef.current,
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
            Validating your session before loading the live trading surface.
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="app-shell min-h-screen p-3 sm:p-4">
      <div className="terminal-shell mx-auto max-w-[1920px]">
        <aside className="terminal-rail reveal-up">
          <div className="rail-brand">
            <div className="status-dot" />
            <div className="rail-eyebrow">{brand.descriptor}</div>
            <div className="rail-wordmark">{brand.name}</div>
          </div>

          <div className="terminal-divider" />

          <div className="rail-stack">
            {(["arena", "operator", "research"] as SurfaceMode[]).map((item) => (
              <button
                key={item}
                type="button"
                className={`rail-tab ${activeSurface === item ? "rail-tab-active" : ""}`}
                onClick={() => focusSurface(item)}
                title={formatSurfaceLabel(item)}
              >
                <span className="mono text-[10px] uppercase tracking-[0.22em]">
                  {formatSurfaceLabel(item)}
                </span>
              </button>
            ))}
          </div>

          <div className="terminal-divider" />

          <div className="rail-stack">
            {TRACKER_SYMBOLS.slice(0, 6).map((item) => (
              <button
                key={item}
                type="button"
                className={`rail-symbol ${symbol === item ? "rail-symbol-active" : ""}`}
                onClick={() => {
                  setSymbol(item);
                  setActiveSurface("arena");
                }}
                title={item}
              >
                {item}
              </button>
            ))}
          </div>

          <div className="mt-auto space-y-3">
            <div className="segmented-shell w-full">
              <button
                className={`segmented-button flex-1 ${
                  horizon === "short_term" ? "segmented-button-active" : ""
                }`}
                type="button"
                onClick={() => setHorizon("short_term")}
              >
                Short
              </button>
              <button
                className={`segmented-button flex-1 ${
                  horizon === "long_term" ? "segmented-button-active" : ""
                }`}
                type="button"
                onClick={() => setHorizon("long_term")}
              >
                Long
              </button>
            </div>

            <div className="rounded-[16px] border border-white/8 bg-white/[0.02] px-3 py-3">
              <div className="text-sm font-semibold text-white">{session.user.name}</div>
              <div className="mt-1 text-xs text-[var(--text-soft)]">{session.user.email}</div>
            </div>

            <button
              className="action-button-secondary w-full"
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
        </aside>

        <main className="terminal-main">
          <header className="terminal-topbar reveal-up reveal-delay-1">
            <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
              <div className="min-w-0 flex-1">
                <div className="eyebrow">Live Market Board</div>
                <div className="mt-2 flex flex-wrap items-end gap-3">
                  <div className="text-[2.3rem] font-semibold tracking-[-0.09em] text-white sm:text-[3rem]">
                    {symbol}
                  </div>
                  <div className="pb-2 text-xs uppercase tracking-[0.24em] text-[var(--text-dim)]">
                    {mergedAnalysis?.company_name || "Loading company profile"}
                  </div>
                </div>
                <div className="mt-3 max-w-4xl text-sm leading-7 text-[var(--text-soft)]">
                  {mergedAnalysis?.guidance.summary ||
                    mergedAnalysis?.professional_analysis.executive_summary ||
                    "Building the active model read, catalyst tape, and execution context."}
                </div>
              </div>

              <div className="flex flex-col items-start gap-2 xl:items-end">
                <div className="desk-chip desk-chip-accent mono">
                  {mergedAnalysis?.market_status || "Loading"}
                </div>
                <div className="desk-chip mono">
                  {horizon === "short_term" ? "Execution Horizon" : "Thesis Horizon"}
                </div>
                <div className="text-xs text-[var(--text-soft)]">
                  {loadingAnalysis || loadingNews ? "Syncing live context" : "Desk in sync"}
                </div>
              </div>
            </div>

            <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
              <form
                className="flex min-w-0 flex-1 flex-col gap-2 xl:max-w-[760px] xl:flex-row"
                onSubmit={(event) => {
                  event.preventDefault();
                  const value = quickOpen.trim().toUpperCase();
                  if (!value) return;
                  setSymbol(value);
                  setQuickOpen("");
                  setActiveSurface("arena");
                }}
              >
                <input
                  className="command-input"
                  value={quickOpen}
                  onChange={(event) => setQuickOpen(event.target.value.toUpperCase())}
                  placeholder="Jump to symbol or coverage name"
                />
                <button className="action-button min-w-[120px]" type="submit">
                  Open Symbol
                </button>
              </form>

              <div className="flex flex-wrap items-center gap-2">
                {TRACKER_SYMBOLS.map((item) => (
                  <button
                    key={item}
                    type="button"
                    className={`ticker-pill ${symbol === item ? "ticker-pill-active" : ""}`}
                    onClick={() => setSymbol(item)}
                  >
                    {item}
                  </button>
                ))}
              </div>
            </div>
          </header>

          <section ref={arenaRef} className="terminal-panel reveal-up reveal-delay-1 scanline">
            <div className="terminal-header">
              <div>
                <div className="eyebrow">Signal Board</div>
                <div className="mt-1 text-base font-semibold text-white">
                  Live read across price, conviction, structure, and regime
                </div>
              </div>
              <div className="desk-chip mono">
                {technical?.data_source_interval || analysisInterval} | {chartRange}
              </div>
            </div>

            <div className="terminal-kpi-grid md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-6">
              {deskStats.map((item) => (
                <div key={item.label} className="terminal-kpi">
                  <div className="terminal-kpi-label">{item.label}</div>
                  <div className={`terminal-kpi-value ${item.tone}`}>{item.value}</div>
                  <div className="terminal-inline-value">{item.note}</div>
                </div>
              ))}
            </div>

            <div className="board-banner">
              <div className="board-banner-grid xl:grid-cols-[minmax(0,1.2fr)_0.8fr]">
                <div>
                  <div className="eyebrow">
                    {horizon === "short_term" ? "Execution Path" : "Thesis Path"}
                  </div>
                  <div className="mt-3 text-base font-semibold text-white">
                    {mergedAnalysis?.guidance.headline || "Generating preferred path"}
                  </div>
                  <div className="mt-2 text-sm leading-7 text-[var(--text-soft)]">
                    {mergedAnalysis?.professional_analysis.plain_english_summary ||
                      "Plain-English context will appear once the model finishes the current pass."}
                  </div>
                </div>

                <div className="terminal-pair-grid sm:grid-cols-2">
                  <div className="terminal-pair">
                    <div>
                      <div className="terminal-kpi-label">Confirmation</div>
                      <div className="mt-2 text-sm text-white">
                        {confirmations.length ? confirmations[0] : "Confirmation factors pending"}
                      </div>
                    </div>
                    <div className="terminal-pill">{confirmations.length}</div>
                  </div>
                  <div className="terminal-pair">
                    <div>
                      <div className="terminal-kpi-label">Risk Stack</div>
                      <div className="mt-2 text-sm text-white">
                        {risks.length ? risks[0] : "Risk notes pending"}
                      </div>
                    </div>
                    <div className="terminal-pill">{risks.length}</div>
                  </div>
                </div>
              </div>
            </div>
          </section>

          <div className="grid gap-3 2xl:grid-cols-[minmax(0,1.36fr)_390px]">
            <div className="min-w-0">
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

            <div ref={operatorRef} className="min-w-0">
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

          <div className="grid gap-3 2xl:grid-cols-[360px_minmax(0,1fr)]">
            <section className="terminal-panel reveal-up reveal-delay-2 overflow-hidden">
              <div className="terminal-header">
                <div>
                  <div className="eyebrow">Decision Tape</div>
                  <div className="mt-1 text-base font-semibold text-white">
                    Confirmation, invalidation, and active caution set
                  </div>
                </div>
                <div className="desk-chip mono">{readable(technical?.regime_state)}</div>
              </div>

              <div className="terminal-list">
                <div className="terminal-row">
                  <div className="terminal-kpi-label">Preferred Direction</div>
                  <div className="mt-2 text-lg font-semibold text-white">
                    {readable(mergedAnalysis?.guidance.preferred_direction)}
                  </div>
                  <div className="mt-2 terminal-note">
                    {mergedAnalysis?.professional_analysis.tactical_stance ||
                      "Tactical stance will populate once the engine finishes the current cycle."}
                  </div>
                </div>

                <div className="terminal-row">
                  <div className="terminal-kpi-label">Confirm</div>
                  <div className="mt-3 space-y-2">
                    {(confirmations.length ? confirmations : ["No confirmation factors listed yet."]).map(
                      (item) => (
                        <div key={item} className="terminal-note">
                          {item}
                        </div>
                      )
                    )}
                  </div>
                </div>

                <div className="terminal-row">
                  <div className="terminal-kpi-label">Invalidate</div>
                  <div className="mt-3 space-y-2">
                    {(invalidations.length ? invalidations : ["No invalidation factors listed yet."]).map(
                      (item) => (
                        <div key={item} className="terminal-note">
                          {item}
                        </div>
                      )
                    )}
                  </div>
                </div>

                <div className="terminal-row">
                  <div className="terminal-kpi-label">Warnings</div>
                  <div className="mt-3 space-y-2">
                    {(warnings.length ? warnings : risks.length ? risks : ["No active warnings yet."]).map(
                      (item) => (
                        <div key={item} className="terminal-note">
                          {item}
                        </div>
                      )
                    )}
                  </div>
                </div>
              </div>
            </section>

            <div ref={researchRef} className="min-w-0">
              {mergedAnalysis ? <InsightPanels analysis={mergedAnalysis} horizon={horizon} /> : null}
            </div>
          </div>

          {(loadingAnalysis || loadingNews) && !error ? (
            <div className="frame-shell reveal-up reveal-delay-2 px-4 py-3 text-sm text-slate-200">
              {isAnalysisLoading(analysis)
                ? "Building the active read, refreshing catalysts, and syncing portfolio context..."
                : "Refreshing price, workflow, and catalyst context..."}
            </div>
          ) : null}

          {error ? (
            <div className="frame-shell reveal-up reveal-delay-2 border-rose-500/20 bg-rose-500/10 px-4 py-3 text-sm text-rose-200">
              {error}
            </div>
          ) : null}
        </main>
      </div>
    </div>
  );
}
