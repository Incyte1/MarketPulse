"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import BrandLockup from "@/components/BrandLockup";
import ChartCard from "@/components/ChartCard";
import InsightPanels from "@/components/InsightPanels";
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

const TRACKER_SYMBOLS = [
  "SPY",
  "QQQ",
  "IWM",
  "NVDA",
  "MSFT",
  "AAPL",
  "META",
  "AMZN",
  "TSLA",
  "AMD",
  "PLTR",
  "AVGO",
];

const TRACKER_NOTES: Record<string, string> = {
  SPY: "S&P 500 proxy",
  QQQ: "Nasdaq leadership",
  IWM: "Small-cap risk",
  NVDA: "AI momentum",
  MSFT: "Mega-cap quality",
  AAPL: "Consumer hardware",
  META: "Ad platform beta",
  AMZN: "Retail and cloud",
  TSLA: "High-beta catalyst tape",
  AMD: "Semis rotation",
  PLTR: "Narrative momentum",
  AVGO: "Infrastructure semis",
};

type HorizonMode = "short_term" | "long_term";
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

function pretty(value?: string | null) {
  if (!value) return "Pending";
  return value.replaceAll("_", " ").replace(/\b\w/g, (match) => match.toUpperCase());
}

export default function WorkspacePage() {
  const router = useRouter();
  const [symbol, setSymbol] = useState(DEFAULT_SYMBOL);
  const [horizon, setHorizon] = useState<HorizonMode>("short_term");
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
  const confirmations = mergedAnalysis?.professional_analysis.confirmation ?? [];
  const invalidations = mergedAnalysis?.professional_analysis.invalidation ?? [];
  const warnings = mergedAnalysis?.guidance.warnings ?? [];
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
      value: pretty(mergedAnalysis?.bias.label),
      note: mergedAnalysis
        ? `${mergedAnalysis.bias.internal_score}/${mergedAnalysis.bias.total_score} model score`
        : "Bias engine pending",
      tone: "signal-neutral",
    },
    {
      label: "Conviction",
      value: pretty(mergedAnalysis?.bias.confidence_label),
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
      note: `${pretty(technical?.volatility_state)} | ${pretty(technical?.momentum_state)}`,
      tone: "signal-neutral",
    },
    {
      label: "Driver",
      value: pretty(mergedAnalysis?.professional_analysis.primary_driver),
      note: mergedAnalysis?.professional_analysis.secondary_drivers.length
        ? mergedAnalysis.professional_analysis.secondary_drivers.map((item) => pretty(item)).join(" | ")
        : "Secondary drivers pending",
      tone: "signal-neutral",
    },
    {
      label: "Regime",
      value: pretty(mergedAnalysis?.professional_analysis.regime),
      note: pretty(technical?.regime_state),
      tone: "signal-neutral",
    },
  ];

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
      <div className="mx-auto max-w-[1920px] space-y-3">
        <header className="command-shell reveal-up px-4 py-4 sm:px-5">
          <div className="flex flex-col gap-4 2xl:flex-row 2xl:items-start 2xl:justify-between">
            <div className="flex min-w-0 flex-1 flex-col gap-4 xl:flex-row xl:items-start xl:gap-6">
              <BrandLockup compact />

              <div className="min-w-0 flex-1">
                <div className="eyebrow">Active Desk</div>
                <div className="mt-2 flex flex-wrap items-end gap-3">
                  <div className="text-[2.35rem] font-semibold tracking-[-0.09em] text-white sm:text-[2.9rem]">
                    {symbol}
                  </div>
                  <div className="pb-2 text-xs uppercase tracking-[0.22em] text-[var(--text-dim)]">
                    {mergedAnalysis?.company_name || "Loading company profile"}
                  </div>
                </div>
                <div className="mt-3 max-w-4xl text-sm leading-7 text-[var(--text-soft)]">
                  {mergedAnalysis?.guidance.summary ||
                    mergedAnalysis?.professional_analysis.executive_summary ||
                    "Building the active model read, catalyst tape, and execution context."}
                </div>
              </div>
            </div>

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

              <div className="rounded-[16px] border border-white/8 bg-white/[0.02] px-4 py-3">
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

          <div className="mt-4 flex flex-col gap-3 2xl:flex-row 2xl:items-center 2xl:justify-between">
            <form
              className="flex min-w-0 flex-1 flex-col gap-2 xl:max-w-[780px] xl:flex-row"
              onSubmit={(event) => {
                event.preventDefault();
                const value = quickOpen.trim().toUpperCase();
                if (!value) return;
                setSymbol(value);
                setQuickOpen("");
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

          <div className="mt-4 terminal-kpi-grid md:grid-cols-2 xl:grid-cols-6">
            {deskStats.map((item) => (
              <div key={item.label} className="terminal-kpi">
                <div className="terminal-kpi-label">{item.label}</div>
                <div className={`terminal-kpi-value ${item.tone}`}>{item.value}</div>
                <div className="terminal-inline-value">{item.note}</div>
              </div>
            ))}
          </div>
        </header>

        <div className="grid gap-3 xl:grid-cols-[280px_minmax(0,1fr)_390px]">
          <section className="terminal-panel reveal-up reveal-delay-1 overflow-hidden">
            <div className="terminal-header">
              <div>
                <div className="eyebrow">Coverage Board</div>
                <div className="mt-1 text-base font-semibold text-white">
                  Liquid names and market proxies
                </div>
              </div>
              <div className="desk-chip mono">{TRACKER_SYMBOLS.length} names</div>
            </div>

            <div className="border-b border-white/8 px-4 py-4 text-sm leading-7 text-[var(--text-soft)]">
              Use this side as the fast symbol lane. The chart arena should stay focused on one active name, while the operator board handles workspace actions and queue logic.
            </div>

            <div className="terminal-list">
              {TRACKER_SYMBOLS.map((item) => (
                <button
                  key={item}
                  type="button"
                  className={`terminal-row w-full text-left transition hover:bg-white/[0.025] ${
                    item === symbol ? "terminal-row-active" : ""
                  }`}
                  onClick={() => setSymbol(item)}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="text-sm font-semibold text-white">{item}</div>
                      <div className="mt-1 text-xs leading-6 text-[var(--text-soft)]">
                        {TRACKER_NOTES[item] || "Active coverage name"}
                      </div>
                    </div>
                    <div className="terminal-pill">{item === symbol ? "Live" : "Open"}</div>
                  </div>
                </button>
              ))}
            </div>
          </section>

          <div className="min-w-0 space-y-3">
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

            <section className="terminal-panel reveal-up reveal-delay-2 overflow-hidden">
              <div className="terminal-header">
                <div>
                  <div className="eyebrow">
                    {horizon === "short_term" ? "Execution Tape" : "Thesis Tape"}
                  </div>
                  <div className="mt-1 text-base font-semibold text-white">
                    Confirmation, invalidation, and active caution set
                  </div>
                </div>
                <div className="desk-chip mono">{pretty(technical?.regime_state)}</div>
              </div>

              <div className="terminal-pair-grid lg:grid-cols-3">
                <div className="terminal-pair">
                  <div>
                    <div className="terminal-kpi-label">Path</div>
                    <div className="mt-2 text-sm font-semibold text-white">
                      {mergedAnalysis?.guidance.headline || "Generating preferred path"}
                    </div>
                    <div className="mt-2 text-xs leading-6 text-[var(--text-soft)]">
                      {mergedAnalysis?.professional_analysis.tactical_stance ||
                        "Tactical stance will populate once the engine completes the read."}
                    </div>
                  </div>
                </div>

                <div className="terminal-pair">
                  <div>
                    <div className="terminal-kpi-label">Confirm</div>
                    <div className="mt-2 space-y-2">
                      {(confirmations.length ? confirmations : ["No confirmation factors listed yet."]).slice(0, 3).map((item) => (
                        <div key={item} className="text-sm text-white">
                          {item}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="terminal-pair">
                  <div>
                    <div className="terminal-kpi-label">Risk Stack</div>
                    <div className="mt-2 space-y-2">
                      {(warnings.length ? warnings : invalidations.length ? invalidations : risks.length ? risks : ["No active warnings yet."])
                        .slice(0, 3)
                        .map((item) => (
                          <div key={item} className="text-sm text-white">
                            {item}
                          </div>
                        ))}
                    </div>
                  </div>
                </div>
              </div>
            </section>
          </div>

          <WorkspaceDock
            session={session}
            symbol={symbol}
            horizon={horizon}
            analysis={mergedAnalysis}
            onActivateSymbol={setSymbol}
            onActivateHorizon={setHorizon}
          />
        </div>

        {mergedAnalysis ? <InsightPanels analysis={mergedAnalysis} horizon={horizon} /> : null}

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
      </div>
    </div>
  );
}
