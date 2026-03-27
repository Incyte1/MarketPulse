"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import type { AnalysisResponse } from "@/lib/api";
import type { AuthSession } from "@/lib/auth";
import { brand } from "@/lib/brand";
import {
  addWorkspaceAlert,
  addWorkspaceSymbol,
  createWorkspace,
  fetchWorkspaceExecutionPreview,
  fetchWorkspaceDetail,
  fetchWorkspacePortfolio,
  fetchWorkspacePortfolioReport,
  fetchWorkspaces,
  removeWorkspaceAlert,
  removeWorkspaceSymbol,
  saveWorkspaceMemo,
  type MemoSourceLink,
  type PortfolioCandidate,
  type WorkspaceExecutionPreviewResponse,
  type WorkspaceDetailResponse,
  type WorkspacePortfolioResponse,
  type WorkspacePortfolioReportResponse,
  type WorkspaceSummary,
  updateWorkspaceSelection,
} from "@/lib/workspaces";

type HorizonMode = "short_term" | "long_term";
type AlertPreset = {
  id: string;
  label: string;
  rule_type: string;
  level: number;
  note: string;
};

type DockTab = "overview" | "portfolio" | "watchlist" | "alerts" | "memo";

type Props = {
  session: AuthSession | null;
  symbol: string;
  horizon: HorizonMode;
  analysis: AnalysisResponse | null;
  onActivateSymbol: (symbol: string) => void;
  onActivateHorizon: (horizon: HorizonMode) => void;
};

type MemoDraft = {
  thesis: string;
  setup: string;
  risks: string;
  invalidation: string;
  execution_plan: string;
  source_links: MemoSourceLink[];
};

function formatHorizon(value: HorizonMode) {
  return value === "short_term" ? "Short-Term" : "Long-Term";
}

function formatRule(ruleType: string) {
  return ruleType.replaceAll("_", " ").replace(/\b\w/g, (match) => match.toUpperCase());
}

function formatTime(value?: string) {
  if (!value) return "Just now";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return value;
  return parsed.toLocaleString();
}

function alertTone(ruleType: string, level: number, currentPrice: number) {
  const upsideRule = ruleType === "breakout_above" || ruleType === "reclaim_vwap";
  const triggered = upsideRule ? currentPrice >= level : currentPrice <= level;
  const distance = Math.abs(((currentPrice - level) / (level || 1)) * 100);

  if (triggered) {
    return {
      label: "Triggered",
      className: "border-emerald-500/20 bg-emerald-500/10 text-emerald-300",
    };
  }

  if (distance <= 0.35) {
    return {
      label: "Near",
      className: "border-amber-500/20 bg-amber-500/10 text-amber-300",
    };
  }

  return {
    label: "Armed",
    className: "border-white/10 bg-white/5 text-slate-300",
  };
}

function dispositionTone(disposition: PortfolioCandidate["disposition"]) {
  if (disposition === "buy") {
    return {
      label: "Buy",
      className: "border-emerald-500/20 bg-emerald-500/10 text-emerald-300",
    };
  }

  if (disposition === "sell") {
    return {
      label: "Sell",
      className: "border-rose-500/20 bg-rose-500/10 text-rose-300",
    };
  }

  return {
    label: "Hold",
    className: "border-amber-500/20 bg-amber-500/10 text-amber-300",
  };
}

function slotTone(slotStatus: string) {
  if (slotStatus === "primary") {
    return {
      label: "Primary",
      className: "border-cyan-500/20 bg-cyan-500/10 text-cyan-200",
    };
  }

  if (slotStatus === "bench") {
    return {
      label: "Bench",
      className: "border-white/10 bg-white/5 text-slate-300",
    };
  }

  if (slotStatus === "exit") {
    return {
      label: "Exit",
      className: "border-rose-500/20 bg-rose-500/10 text-rose-300",
    };
  }

  return {
    label: "Review",
    className: "border-amber-500/20 bg-amber-500/10 text-amber-300",
  };
}

function formatDriverLabel(driver: string) {
  return driver.replace(/\b\w/g, (match) => match.toUpperCase());
}

function actionTone(action: string) {
  if (action === "sell" || action === "trim") {
    return "border-rose-500/20 bg-rose-500/10 text-rose-300";
  }
  if (action === "buy" || action === "add") {
    return "border-emerald-500/20 bg-emerald-500/10 text-emerald-300";
  }
  return "border-white/10 bg-white/5 text-slate-300";
}

function emptyDraft(): MemoDraft {
  return {
    thesis: "",
    setup: "",
    risks: "",
    invalidation: "",
    execution_plan: "",
    source_links: [],
  };
}

function memoFromDetail(detail: WorkspaceDetailResponse | null): MemoDraft {
  if (!detail) return emptyDraft();
  return {
    thesis: detail.memo.thesis,
    setup: detail.memo.setup,
    risks: detail.memo.risks,
    invalidation: detail.memo.invalidation,
    execution_plan: detail.memo.execution_plan,
    source_links: detail.memo.source_links,
  };
}

function mergeWorkspaceSummary(items: WorkspaceSummary[], nextItem: WorkspaceSummary) {
  const next = items.some((item) => item.id === nextItem.id)
    ? items.map((item) => (item.id === nextItem.id ? nextItem : item))
    : [nextItem, ...items];

  return next.sort((left, right) => {
    if (left.is_default !== right.is_default) {
      return left.is_default ? -1 : 1;
    }
    return new Date(right.updated_at).getTime() - new Date(left.updated_at).getTime();
  });
}

export default function WorkspaceDock({
  session,
  symbol,
  horizon,
  analysis,
  onActivateSymbol,
  onActivateHorizon,
}: Props) {
  const [workspaces, setWorkspaces] = useState<WorkspaceSummary[]>([]);
  const [activeWorkspaceId, setActiveWorkspaceId] = useState<number | null>(null);
  const [detail, setDetail] = useState<WorkspaceDetailResponse | null>(null);
  const [portfolio, setPortfolio] = useState<WorkspacePortfolioResponse | null>(null);
  const [portfolioReport, setPortfolioReport] = useState<WorkspacePortfolioReportResponse | null>(null);
  const [executionPreview, setExecutionPreview] = useState<WorkspaceExecutionPreviewResponse | null>(null);
  const [memoDraft, setMemoDraft] = useState<MemoDraft>(emptyDraft());
  const [createName, setCreateName] = useState("");
  const [loading, setLoading] = useState(false);
  const [loadingPortfolio, setLoadingPortfolio] = useState(false);
  const [loadingExecution, setLoadingExecution] = useState(false);
  const [mutating, setMutating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<DockTab>("overview");

  const token = session?.token ?? null;
  const currentPrice = analysis?.price_context.current_price ?? 0;
  const technical = analysis?.technical_context;
  const memoSourceCount = detail?.memo.source_links.length ?? 0;
  const watchlistSignature = detail?.watchlist.map((item) => item.symbol).join("|") ?? "";
  const memoWorkspaceId = detail?.workspace.id ?? null;
  const memoUpdatedAt = detail?.memo.updated_at ?? "";
  const memoThesis = detail?.memo.thesis ?? "";
  const memoSetup = detail?.memo.setup ?? "";
  const memoRisks = detail?.memo.risks ?? "";
  const memoInvalidation = detail?.memo.invalidation ?? "";
  const memoExecutionPlan = detail?.memo.execution_plan ?? "";
  const memoSourceLinksSerialized = JSON.stringify(detail?.memo.source_links ?? []);
  const memoSeed = useMemo<MemoDraft>(
    () => {
      if (
        memoWorkspaceId == null &&
        !memoUpdatedAt &&
        !memoThesis &&
        !memoSetup &&
        !memoRisks &&
        !memoInvalidation &&
        !memoExecutionPlan &&
        memoSourceLinksSerialized === "[]"
      ) {
        return emptyDraft();
      }

      return {
        thesis: memoThesis,
        setup: memoSetup,
        risks: memoRisks,
        invalidation: memoInvalidation,
        execution_plan: memoExecutionPlan,
        source_links: JSON.parse(memoSourceLinksSerialized) as MemoSourceLink[],
      };
    },
    [
      memoWorkspaceId,
      memoUpdatedAt,
      memoThesis,
      memoSetup,
      memoRisks,
      memoInvalidation,
      memoExecutionPlan,
      memoSourceLinksSerialized,
    ]
  );

  const suggestedSources = useMemo(() => {
    const seen = new Set<string>();
    const candidates = [
      ...(analysis?.interpreted_ticker_news ?? []),
      ...(analysis?.interpreted_macro_news ?? []),
    ];

    const links: MemoSourceLink[] = [];
    for (const article of candidates) {
      if (!article.url || seen.has(article.url)) continue;
      seen.add(article.url);
      links.push({
        label: `${article.source || "Source"} | ${article.title}`,
        url: article.url,
        kind: article.article_type || "article",
      });
      if (links.length >= 6) break;
    }
    return links;
  }, [analysis]);

  const alertPresets = useMemo(() => {
    if (!technical) return [];

    const presets: AlertPreset[] = [];
    if (technical.resistance_level && technical.resistance_level > 0) {
      presets.push({
        id: "breakout_above",
        label: `Breakout > ${technical.resistance_level.toFixed(2)}`,
        rule_type: "breakout_above",
        level: technical.resistance_level,
        note: `${formatHorizon(horizon)} breakout through engine resistance.`,
      });
    }
    if (technical.support_level && technical.support_level > 0) {
      presets.push({
        id: "breakdown_below",
        label: `Breakdown < ${technical.support_level.toFixed(2)}`,
        rule_type: "breakdown_below",
        level: technical.support_level,
        note: `${formatHorizon(horizon)} loss of engine support.`,
      });
    }
    if (technical.vwap && technical.vwap > 0) {
      presets.push({
        id: "reclaim_vwap",
        label: `Reclaim VWAP ${technical.vwap.toFixed(2)}`,
        rule_type: "reclaim_vwap",
        level: technical.vwap,
        note: `${formatHorizon(horizon)} reclaim of active VWAP reference.`,
      });
    }
    return presets;
  }, [horizon, technical]);

  useEffect(() => {
    if (!token) {
      setWorkspaces([]);
      setActiveWorkspaceId(null);
      setDetail(null);
      setPortfolio(null);
      setPortfolioReport(null);
      setExecutionPreview(null);
      setMemoDraft(emptyDraft());
      setError(null);
      return;
    }

    let cancelled = false;
    const sessionToken = token;

    async function load() {
      try {
        setLoading(true);
        setError(null);
        const summaries = await fetchWorkspaces(sessionToken);
        if (cancelled) return;

        setWorkspaces(summaries);
        const firstWorkspace = summaries[0];
        if (!firstWorkspace) {
          setActiveWorkspaceId(null);
          setDetail(null);
          setPortfolio(null);
          setPortfolioReport(null);
          setExecutionPreview(null);
          return;
        }

        setActiveWorkspaceId(firstWorkspace.id);
        const nextDetail = await fetchWorkspaceDetail(sessionToken, firstWorkspace.id);
        if (cancelled) return;

        setDetail(nextDetail);
        setMemoDraft(memoFromDetail(nextDetail));
        onActivateSymbol(nextDetail.workspace.selected_symbol);
        onActivateHorizon(nextDetail.workspace.selected_horizon);
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Failed to load workflow layer.");
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    load();

    return () => {
      cancelled = true;
    };
  }, [onActivateHorizon, onActivateSymbol, token]);

  useEffect(() => {
    if (!token || activeWorkspaceId == null || loading) return;
    if (detail?.workspace.id === activeWorkspaceId) return;

    let cancelled = false;
    const sessionToken = token;
    const selectedWorkspaceId = activeWorkspaceId;

    async function loadDetail() {
      try {
        setLoading(true);
        const nextDetail = await fetchWorkspaceDetail(sessionToken, selectedWorkspaceId);
        if (cancelled) return;

        setDetail(nextDetail);
        setMemoDraft(memoFromDetail(nextDetail));
        onActivateSymbol(nextDetail.workspace.selected_symbol);
        onActivateHorizon(nextDetail.workspace.selected_horizon);
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Failed to load workspace detail.");
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    loadDetail();

    return () => {
      cancelled = true;
    };
  }, [activeWorkspaceId, detail?.workspace.id, loading, onActivateHorizon, onActivateSymbol, token]);

  useEffect(() => {
    setMemoDraft(memoSeed);
  }, [memoSeed]);

  useEffect(() => {
    if (!token || !detail?.workspace.id) {
      setPortfolio(null);
      setPortfolioReport(null);
      setExecutionPreview(null);
      return;
    }

    let cancelled = false;
    const sessionToken = token;
    const workspaceId = detail.workspace.id;

    async function loadPortfolio() {
      try {
        setLoadingPortfolio(true);
        setLoadingExecution(true);
        const [nextPortfolio, nextPortfolioReport, nextExecutionPreview] = await Promise.all([
          fetchWorkspacePortfolio(sessionToken, workspaceId),
          fetchWorkspacePortfolioReport(sessionToken, workspaceId),
          fetchWorkspaceExecutionPreview(sessionToken, workspaceId),
        ]);
        if (cancelled) return;
        setPortfolio(nextPortfolio);
        setPortfolioReport(nextPortfolioReport);
        setExecutionPreview(nextExecutionPreview);
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Failed to load portfolio engine.");
        }
      } finally {
        if (!cancelled) {
          setLoadingPortfolio(false);
          setLoadingExecution(false);
        }
      }
    }

    loadPortfolio();

    return () => {
      cancelled = true;
    };
  }, [
    detail?.workspace.id,
    detail?.workspace.selected_horizon,
    detail?.workspace.selected_symbol,
    token,
    watchlistSignature,
  ]);

  useEffect(() => {
    if (!token || !detail) return;
    if (
      detail.workspace.selected_symbol === symbol &&
      detail.workspace.selected_horizon === horizon
    ) {
      return;
    }

    let cancelled = false;
    const sessionToken = token;
    const activeDetail = detail;

    async function syncSelection() {
      try {
        const updated = await updateWorkspaceSelection(sessionToken, activeDetail.workspace.id, {
          selected_symbol: symbol,
          selected_horizon: horizon,
        });
        if (cancelled) return;

        setWorkspaces((current) => mergeWorkspaceSummary(current, updated));
        setDetail((current) =>
          current
            ? {
                ...current,
                workspace: updated,
              }
            : current
        );
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Failed to sync workspace selection.");
        }
      }
    }

    syncSelection();

    return () => {
      cancelled = true;
    };
  }, [detail, horizon, symbol, token]);

  async function handleCreateWorkspace() {
    if (!token || !createName.trim()) return;
    const sessionToken = token;

    try {
      setMutating(true);
      setError(null);
      const created = await createWorkspace(sessionToken, {
        name: createName.trim(),
        selected_symbol: symbol,
        selected_horizon: horizon,
      });
      setWorkspaces((current) => mergeWorkspaceSummary(current, created));
      setActiveWorkspaceId(created.id);
      setCreateName("");
      setActiveTab("overview");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create workspace.");
    } finally {
      setMutating(false);
    }
  }

  async function handleAddCurrentSymbol() {
    if (!token || !detail) return;
    const sessionToken = token;

    try {
      setMutating(true);
      setError(null);
      const nextDetail = await addWorkspaceSymbol(sessionToken, detail.workspace.id, { symbol });
      setDetail(nextDetail);
      setWorkspaces((current) => mergeWorkspaceSummary(current, nextDetail.workspace));
      setActiveTab("watchlist");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to add symbol to watchlist.");
    } finally {
      setMutating(false);
    }
  }

  async function handleRemoveSymbol(nextSymbol: string) {
    if (!token || !detail) return;
    const sessionToken = token;

    try {
      setMutating(true);
      setError(null);
      const nextDetail = await removeWorkspaceSymbol(sessionToken, detail.workspace.id, nextSymbol);
      setDetail(nextDetail);
      setWorkspaces((current) => mergeWorkspaceSummary(current, nextDetail.workspace));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to remove symbol from watchlist.");
    } finally {
      setMutating(false);
    }
  }

  async function handleCreateAlert(ruleType: string, level: number, note: string) {
    if (!token || !detail) return;
    const sessionToken = token;

    try {
      setMutating(true);
      setError(null);
      const nextDetail = await addWorkspaceAlert(sessionToken, detail.workspace.id, {
        symbol,
        horizon,
        rule_type: ruleType,
        level,
        note,
      });
      setDetail(nextDetail);
      setWorkspaces((current) => mergeWorkspaceSummary(current, nextDetail.workspace));
      setActiveTab("alerts");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create alert.");
    } finally {
      setMutating(false);
    }
  }

  async function handleDeleteAlert(alertId: number) {
    if (!token || !detail) return;
    const sessionToken = token;

    try {
      setMutating(true);
      setError(null);
      const nextDetail = await removeWorkspaceAlert(sessionToken, detail.workspace.id, alertId);
      setDetail(nextDetail);
      setWorkspaces((current) => mergeWorkspaceSummary(current, nextDetail.workspace));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete alert.");
    } finally {
      setMutating(false);
    }
  }

  async function handleSaveMemo() {
    if (!token || !detail) return;
    const sessionToken = token;

    try {
      setMutating(true);
      setError(null);
      const nextDetail = await saveWorkspaceMemo(sessionToken, detail.workspace.id, memoDraft);
      setDetail(nextDetail);
      setWorkspaces((current) => mergeWorkspaceSummary(current, nextDetail.workspace));
      setActiveTab("memo");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save memo.");
    } finally {
      setMutating(false);
    }
  }

  function attachCurrentSources() {
    setMemoDraft((current) => {
      const seen = new Set(current.source_links.map((item) => item.url));
      const merged = [...current.source_links];
      for (const item of suggestedSources) {
        if (seen.has(item.url)) continue;
        seen.add(item.url);
        merged.push(item);
      }
      return { ...current, source_links: merged };
    });
  }

  function removeSource(url: string) {
    setMemoDraft((current) => ({
      ...current,
      source_links: current.source_links.filter((item) => item.url !== url),
    }));
  }

  const topOpportunities =
    portfolioReport?.top_opportunities.slice(0, 3) ?? portfolio?.buy_queue.slice(0, 3) ?? [];
  const topActions = executionPreview?.proposed_actions.slice(0, 3) ?? [];

  function renderPortfolioGroup(
    title: string,
    subtitle: string,
    items: PortfolioCandidate[],
    emptyState: string
  ) {
    return (
      <div className="space-y-2">
        <div className="flex items-center justify-between gap-3">
          <div>
            <div className="text-sm font-semibold text-white">{title}</div>
            <div className="mt-1 text-xs text-slate-500">{subtitle}</div>
          </div>
          <div className="desk-chip mono">{items.length}</div>
        </div>

        {items.length ? (
          items.map((item) => {
            const signalTone = dispositionTone(item.disposition);
            const statusTone = slotTone(item.slot_status);

            return (
              <button
                key={`${title}-${item.symbol}`}
                type="button"
                className="interactive-row block w-full text-left"
                onClick={() => onActivateSymbol(item.symbol)}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-sm font-semibold text-white">{item.symbol}</span>
                      <span className="truncate text-xs text-slate-500">{item.company_name}</span>
                    </div>
                    <div className="mt-2 text-sm leading-6 text-slate-300">
                      {item.summary || item.reasons[0] || "No portfolio summary available yet."}
                    </div>
                  </div>

                  <div className="flex shrink-0 flex-col items-end gap-2">
                    <div className={`rounded-full border px-2 py-1 text-xs ${signalTone.className}`}>
                      {signalTone.label}
                    </div>
                    <div className={`rounded-full border px-2 py-1 text-xs ${statusTone.className}`}>
                      {statusTone.label}
                    </div>
                  </div>
                </div>

                <div className="mt-3 flex flex-wrap gap-2 text-[11px] uppercase tracking-[0.16em] text-slate-500">
                  {item.rank ? <span>Rank {item.rank}</span> : null}
                  <span>Score {item.conviction_score.toFixed(1)}</span>
                  {item.target_weight_percent > 0 ? (
                    <span>Weight {item.target_weight_percent.toFixed(1)}%</span>
                  ) : null}
                  <span>{item.bias_label}</span>
                  <span>{item.confidence_label}</span>
                  <span>{item.sector}</span>
                  <span>{formatDriverLabel(item.primary_driver)}</span>
                </div>

                <div className="mt-3 grid gap-2 text-xs text-slate-400 sm:grid-cols-2">
                  <div>
                    Trend {item.trend_medium} | Regime {item.regime_state.replaceAll("_", " ")}
                  </div>
                  <div>
                    Price {item.current_price.toFixed(2)} | Levels {item.support_level.toFixed(2)} /{" "}
                    {item.resistance_level.toFixed(2)}
                  </div>
                  <div>
                    20D RS vs {item.benchmark_symbol} {item.relative_strength_20d.toFixed(2)}% | Sector{" "}
                    {item.relative_strength_sector_20d.toFixed(2)}%
                  </div>
                  <div>
                    Volume x{item.volume_ratio_20d.toFixed(2)} | ATR {item.atr_percent.toFixed(2)}%
                  </div>
                </div>

                {item.reasons.length ? (
                  <div className="mt-3 text-xs leading-5 text-slate-300">{item.reasons[0]}</div>
                ) : null}

                {item.warnings.length ? (
                  <div className="mt-1 text-xs leading-5 text-slate-500">{item.warnings[0]}</div>
                ) : null}
              </button>
            );
          })
        ) : (
          <div className="interactive-row text-sm text-slate-300">{emptyState}</div>
        )}
      </div>
    );
  }

  if (!session) {
    return (
      <aside className="space-y-3 xl:self-start">
        <section className="terminal-panel reveal-up reveal-delay-2 overflow-hidden">
          <div className="terminal-header">
            <div>
              <div className="eyebrow">Operator Board</div>
              <div className="mt-1 text-base font-semibold text-white">Persistent workspace tools</div>
            </div>
            <div className="desk-chip mono">Auth Required</div>
          </div>

          <div className="terminal-list">
            <div className="terminal-row">
              <div className="terminal-kpi-label">What unlocks after sign-in</div>
              <div className="mt-3 text-sm leading-7 text-slate-300">
                Save desks, restore symbol and horizon state, build alert rules, and keep source-linked investment notes attached to the active workflow.
              </div>
            </div>
            <div className="terminal-row">
              <div className="grid gap-2">
                <div className="terminal-note">Saved workspaces with symbol and horizon memory.</div>
                <div className="terminal-note">Alert rules built from current support, resistance, and VWAP levels.</div>
                <div className="terminal-note">Source-linked memos tied to the catalyst stream.</div>
              </div>
            </div>
          </div>

          <div className="px-4 py-4">
            <div className="flex gap-3">
            <Link href="/login" className="action-button-secondary">
              Login
            </Link>
            <Link href="/register" className="action-button">
              Create {brand.name} Account
            </Link>
            </div>
          </div>
        </section>
      </aside>
    );
  }

  return (
    <aside className="space-y-3 xl:self-start">
      <section className="terminal-panel reveal-up reveal-delay-2 overflow-hidden">
        <div className="terminal-header">
          <div>
            <div className="eyebrow">Operator Board</div>
            <div className="mt-1 text-base font-semibold text-white">
              Workspace switching, ranked queue, and execution state
            </div>
          </div>
          {detail ? <div className="desk-chip mono">Updated {formatTime(detail.workspace.updated_at)}</div> : null}
        </div>

        <div className="border-b border-white/8 overflow-x-auto">
          <div className="ticker-strip">
            {workspaces.map((workspace) => (
              <button
                key={workspace.id}
                type="button"
                className={`ticker-pill ${activeWorkspaceId === workspace.id ? "ticker-pill-active" : ""}`}
                onClick={() => setActiveWorkspaceId(workspace.id)}
              >
                {workspace.name}
              </button>
            ))}
          </div>
        </div>

        <div className="border-b border-white/8 px-4 py-4">
          <div className="flex gap-2">
            <input
              className="text-input"
              placeholder="Create new workspace"
              value={createName}
              onChange={(event) => setCreateName(event.target.value)}
            />
            <button
              type="button"
              className="action-button min-w-[96px]"
              disabled={mutating || !createName.trim()}
              onClick={handleCreateWorkspace}
            >
              Create
            </button>
          </div>
        </div>

        <div className="border-b border-white/8 px-4 py-3">
          <div className="flex flex-wrap gap-2">
            <button type="button" className="action-button-secondary" onClick={handleAddCurrentSymbol}>
              Add {symbol}
            </button>
            <button
              type="button"
              className="action-button-secondary"
              onClick={() => onActivateHorizon(horizon === "short_term" ? "long_term" : "short_term")}
            >
              Switch to {horizon === "short_term" ? "Long Horizon" : "Short Horizon"}
            </button>
          </div>
        </div>

        <div className="terminal-pair-grid sm:grid-cols-2">
          <div className="terminal-pair">
            <div>
              <div className="terminal-kpi-label">Coverage</div>
              <div className="mt-2 text-sm font-semibold text-white">{detail?.watchlist.length ?? 0} names</div>
            </div>
            <div className="text-sm text-[var(--text-soft)]">{detail?.workspace.selected_symbol || symbol}</div>
          </div>
          <div className="terminal-pair">
            <div>
              <div className="terminal-kpi-label">Alerts</div>
              <div className="mt-2 text-sm font-semibold text-white">{detail?.alerts.length ?? 0} armed</div>
            </div>
            <div className="text-sm text-[var(--text-soft)]">{formatHorizon(horizon)}</div>
          </div>
          <div className="terminal-pair">
            <div>
              <div className="terminal-kpi-label">Memory</div>
              <div className="mt-2 text-sm font-semibold text-white">{memoSourceCount} sources</div>
            </div>
            <div className="text-sm text-[var(--text-soft)]">
              {detail?.memo.updated_at ? "Saved" : "Draft only"}
            </div>
          </div>
          <div className="terminal-pair">
            <div>
              <div className="terminal-kpi-label">Portfolio</div>
              <div className="mt-2 text-sm font-semibold text-white">{portfolio?.buy_queue.length ?? 0} buys</div>
            </div>
            <div className="text-sm text-[var(--text-soft)]">{portfolio ? `${portfolio.capacity_limit} slots` : "Syncing"}</div>
          </div>
        </div>

        <div className="border-b border-white/8 px-3 py-3">
          <div className="grid grid-cols-5 gap-2">
            {(["overview", "portfolio", "watchlist", "alerts", "memo"] as DockTab[]).map((tab) => (
              <button
                key={tab}
                type="button"
                className={`surface-tab ${activeTab === tab ? "surface-tab-active" : ""}`}
                onClick={() => setActiveTab(tab)}
              >
                {tab === "overview"
                  ? "Board"
                  : tab === "portfolio"
                    ? "Queue"
                    : tab === "watchlist"
                      ? "List"
                      : tab === "alerts"
                        ? "Alerts"
                        : "Memo"}
              </button>
            ))}
          </div>
        </div>

        {activeTab === "overview" ? (
          <div className="terminal-list">
            <div className="terminal-row">
              <div className="terminal-kpi-label">Active Workspace</div>
              <div className="mt-2 text-sm font-semibold text-white">
                {detail?.workspace.name || "Workspace detail is loading"}
              </div>
              <div className="mt-2 text-sm leading-7 text-[var(--text-soft)]">
                {detail
                  ? `${detail.workspace.name} stores the symbol, horizon, memo state, and queue context for this review loop.`
                  : "Workspace detail is loading."}
              </div>
            </div>

            <div className="terminal-row">
              <div className="terminal-kpi-label">Portfolio Engine</div>
              <div className="mt-2 text-sm leading-7 text-[var(--text-soft)]">
                {portfolio ? portfolio.overview : "Ranking the active watchlist into buy, hold, and exit queues."}
              </div>
            </div>

            <div className="terminal-row">
              <div className="terminal-kpi-label">Top Opportunities</div>
              <div className="mt-3 space-y-3">
                {topOpportunities.length ? (
                  topOpportunities.map((item) => (
                    <button
                      key={`top-${item.symbol}`}
                      type="button"
                      className="flex w-full items-start justify-between gap-3 text-left"
                      onClick={() => onActivateSymbol(item.symbol)}
                    >
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <div className="text-sm font-semibold text-white">{item.symbol}</div>
                          <span className={`rounded-full border px-2 py-1 text-[11px] ${slotTone(item.slot_status).className}`}>
                            {slotTone(item.slot_status).label}
                          </span>
                        </div>
                        <div className="mt-2 text-xs leading-6 text-[var(--text-soft)]">{item.summary}</div>
                      </div>
                      <div className="text-right">
                        <div className="text-sm font-semibold text-white">{item.target_weight_percent.toFixed(1)}%</div>
                        <div className="mt-1 text-xs text-[var(--text-soft)]">RS {item.relative_strength_20d.toFixed(1)}</div>
                      </div>
                    </button>
                  ))
                ) : (
                  <div className="text-sm text-slate-300">No clean top opportunities are ready right now.</div>
                )}
              </div>
            </div>

            <div className="terminal-row">
              <div className="terminal-kpi-label">Execution Preview</div>
              <div className="mt-3 space-y-3">
                {topActions.length ? (
                  topActions.map((action) => (
                    <div key={`${action.action}-${action.symbol}`} className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="text-sm font-semibold text-white">{action.symbol}</div>
                        <div className="mt-1 text-xs leading-6 text-[var(--text-soft)]">{action.rationale}</div>
                      </div>
                      <div className="text-right">
                        <div className={`rounded-full border px-2 py-1 text-[11px] ${actionTone(action.action)}`}>
                          {action.action.toUpperCase()}
                        </div>
                        <div className="mt-2 text-xs text-[var(--text-soft)]">
                          {action.current_weight_percent.toFixed(1)}% to {action.target_weight_percent.toFixed(1)}%
                        </div>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-sm text-slate-300">
                    {loadingExecution ? "Building execution preview..." : "No execution changes are being proposed right now."}
                  </div>
                )}
              </div>
            </div>
          </div>
        ) : null}
      </section>

      <section
        className={`terminal-panel reveal-up reveal-delay-3 p-4 lg:p-5 ${
          activeTab === "portfolio" ? "" : "hidden"
        }`}
      >
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="eyebrow">Queue Board</div>
            <div className="mt-2 text-lg font-semibold text-white">Ranked action queue</div>
            <div className="mt-1 text-sm text-slate-400">
              Seero-style orchestration built on your existing ticker engine.
            </div>
          </div>

          {portfolio ? (
            <div className="flex flex-col items-end gap-2">
              <div className="desk-chip mono">{portfolio.market_status}</div>
              <div className="text-xs text-slate-500">
                {portfolio.coverage_count} symbols | {portfolio.capacity_limit} slots
              </div>
            </div>
          ) : null}
        </div>

        {loadingPortfolio ? (
          <div className="interactive-row mt-4 text-sm text-slate-300">
            Ranking the current universe and building the portfolio queue...
          </div>
        ) : null}

        {portfolio ? (
          <div className="mt-4 space-y-4">
            <div className="interactive-row text-sm leading-7 text-slate-200">
              {portfolio.overview}
            </div>

            {renderPortfolioGroup(
              "Buy Queue",
              "Fresh capital should flow top-down through this ranked list.",
              portfolio.buy_queue,
              "No clean buy candidates are ready right now."
            )}

            {renderPortfolioGroup(
              "Review Queue",
              "Mixed reads that still need cleaner confirmation or stronger conviction.",
              portfolio.hold_queue,
              "No review names are parked here right now."
            )}

            {renderPortfolioGroup(
              "Exit Queue",
              "Symbols where the current engine leans defensive.",
              portfolio.sell_queue,
              "No immediate exit candidates were flagged."
            )}

            {portfolio.errors.length ? (
              <div className="interactive-row border-amber-500/20 bg-amber-500/10 text-sm text-amber-100">
                {portfolio.errors.join(" | ")}
              </div>
            ) : null}

            {portfolioReport ? (
              <div className="space-y-3">
                <div className="grid gap-2 sm:grid-cols-3">
                  <div className="interactive-row">
                    <div className="eyebrow">Model 20D</div>
                    <div className="mt-2 text-base font-semibold text-white">
                      {portfolioReport.model_portfolio_return_20d.toFixed(2)}%
                    </div>
                    <div className="mt-1 text-xs text-slate-500">Weighted active-slot profile</div>
                  </div>
                  <div className="interactive-row">
                    <div className="eyebrow">Email Brief</div>
                    <div className="mt-2 text-sm font-semibold text-white">
                      {portfolioReport.email_subject}
                    </div>
                    <div className="mt-1 text-xs text-slate-500">Daily summary draft</div>
                  </div>
                  <div className="interactive-row">
                    <div className="eyebrow">Top Risk Count</div>
                    <div className="mt-2 text-base font-semibold text-white">
                      {portfolioReport.top_risks.length}
                    </div>
                    <div className="mt-1 text-xs text-slate-500">Current portfolio cautions</div>
                  </div>
                </div>

                <div className="interactive-row">
                  <div className="text-sm font-semibold text-white">{portfolioReport.headline}</div>
                  <div className="mt-2 text-sm leading-7 text-slate-300">{portfolioReport.summary}</div>
                  <div className="mt-3 text-xs leading-6 text-slate-500">{portfolioReport.email_preview}</div>
                </div>

                <div className="grid gap-2 sm:grid-cols-2">
                  <div className="interactive-row">
                    <div className="text-sm font-semibold text-white">Benchmark Comparison</div>
                    <div className="mt-3 space-y-2">
                      {portfolioReport.benchmark_comparison.map((item) => (
                        <div key={`${item.label}-${item.symbol}`} className="flex items-center justify-between gap-3 text-sm">
                          <div className="text-slate-300">
                            {item.label} <span className="text-slate-500">({item.symbol})</span>
                          </div>
                          <div className="text-right">
                            <div className="font-medium text-white">{item.return_percent.toFixed(2)}%</div>
                            <div className="text-xs text-slate-500">
                              Delta {item.comparison_delta_percent.toFixed(2)}%
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="interactive-row">
                    <div className="text-sm font-semibold text-white">Rebalance Notes</div>
                    <div className="mt-3 space-y-2 text-sm leading-7 text-slate-300">
                      {portfolioReport.rebalance_notes.map((note) => (
                        <div key={note}>{note}</div>
                      ))}
                    </div>
                    {portfolioReport.top_risks.length ? (
                      <div className="mt-4 border-t border-white/10 pt-3">
                        <div className="text-xs uppercase tracking-[0.16em] text-slate-500">Top risks</div>
                        <div className="mt-2 space-y-2 text-sm leading-6 text-slate-400">
                          {portfolioReport.top_risks.map((risk) => (
                            <div key={risk}>{risk}</div>
                          ))}
                        </div>
                      </div>
                    ) : null}
                  </div>
                </div>
              </div>
            ) : null}

            {executionPreview ? (
              <div className="space-y-3">
                <div className="interactive-row">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="text-sm font-semibold text-white">Execution Preview</div>
                      <div className="mt-2 text-sm leading-7 text-slate-300">
                        Broker mode {executionPreview.alpaca_status.mode} | status{" "}
                        {executionPreview.alpaca_status.account_status}
                      </div>
                    </div>
                    <div className="desk-chip mono">
                      {executionPreview.alpaca_status.connected ? "Broker Connected" : "Preview Only"}
                    </div>
                  </div>

                  <div className="mt-3 grid gap-2 text-xs text-slate-400 sm:grid-cols-3">
                    <div>Equity {executionPreview.alpaca_status.equity.toFixed(2)}</div>
                    <div>Buying Power {executionPreview.alpaca_status.buying_power.toFixed(2)}</div>
                    <div>Positions {executionPreview.alpaca_status.positions_count}</div>
                  </div>
                  <div className="mt-3 text-xs leading-6 text-slate-500">
                    {executionPreview.alpaca_status.message}
                  </div>
                </div>

                {loadingExecution ? (
                  <div className="interactive-row text-sm text-slate-300">
                    Building execution preview and target allocations...
                  </div>
                ) : null}

                <div className="interactive-row">
                  <div className="text-sm font-semibold text-white">Proposed Actions</div>
                  <div className="mt-3 space-y-2">
                    {executionPreview.proposed_actions.length ? (
                      executionPreview.proposed_actions.map((action) => (
                        <div key={`${action.action}-${action.symbol}`} className="flex items-start justify-between gap-3 rounded-[14px] border border-white/10 bg-white/[0.03] px-3 py-3">
                          <div>
                            <div className="text-sm font-semibold text-white">{action.symbol}</div>
                            <div className="mt-1 text-xs leading-6 text-slate-400">
                              {action.rationale}
                            </div>
                          </div>
                          <div className="text-right">
                            <div className={`rounded-full border px-2 py-1 text-xs ${actionTone(action.action)}`}>
                              {action.action.toUpperCase()}
                            </div>
                            <div className="mt-2 text-xs text-slate-500">
                              {action.current_weight_percent.toFixed(2)}% to{" "}
                              {action.target_weight_percent.toFixed(2)}%
                            </div>
                            <div className="text-xs text-slate-500">
                              Delta {action.delta_weight_percent.toFixed(2)}%
                            </div>
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="text-sm text-slate-300">
                        No execution changes are being proposed right now.
                      </div>
                    )}
                  </div>
                </div>

                {executionPreview.warnings.length ? (
                  <div className="interactive-row border-amber-500/20 bg-amber-500/10 text-sm text-amber-100">
                    {executionPreview.warnings.join(" | ")}
                  </div>
                ) : null}
              </div>
            ) : null}
          </div>
        ) : null}
      </section>

      <section
        className={`terminal-panel reveal-up reveal-delay-3 p-4 lg:p-5 ${
          activeTab === "watchlist" ? "" : "hidden"
        }`}
      >
        <div className="flex items-center justify-between gap-3">
          <div>
            <div className="eyebrow">Coverage Queue</div>
            <div className="mt-2 text-lg font-semibold text-white">Saved symbol lineup</div>
          </div>
          <button
            type="button"
            className="action-button-secondary"
            disabled={!detail || mutating}
            onClick={handleAddCurrentSymbol}
          >
            Add {symbol}
          </button>
        </div>

        <div className="mt-4 space-y-2">
          {detail?.watchlist.length ? (
            detail.watchlist.map((item) => (
              <div
                key={item.id}
                className={`interactive-row flex items-center justify-between gap-3 ${
                  item.symbol === symbol
                    ? "border-[var(--accent)]/28 bg-[var(--accent)]/10"
                    : ""
                }`}
              >
                <button
                  type="button"
                  className="min-w-0 flex-1 text-left"
                  onClick={() => onActivateSymbol(item.symbol)}
                >
                  <div className="text-sm font-semibold text-white">{item.symbol}</div>
                  <div className="mt-1 truncate text-xs text-slate-500">
                    {item.notes || "Saved coverage name"}
                  </div>
                </button>
                <button
                  type="button"
                  className="rounded-[12px] border border-white/10 px-2 py-1 text-xs text-slate-300 transition hover:border-white/20"
                  onClick={() => handleRemoveSymbol(item.symbol)}
                >
                  Remove
                </button>
              </div>
            ))
          ) : (
            <div className="interactive-row text-sm text-slate-300">
              No saved symbols yet. Add the current symbol to build a reusable review queue.
            </div>
          )}
        </div>
      </section>

      <section
        className={`terminal-panel reveal-up reveal-delay-3 p-4 lg:p-5 ${
          activeTab === "alerts" ? "" : "hidden"
        }`}
      >
        <div className="flex items-center justify-between gap-3">
          <div>
            <div className="eyebrow">Alert Grid</div>
            <div className="mt-2 text-lg font-semibold text-white">Execution rules</div>
          </div>
          <div className="desk-chip mono">
            {technical?.support_level?.toFixed(2) ?? "n/a"} / {technical?.resistance_level?.toFixed(2) ?? "n/a"}
          </div>
        </div>

        <div className="mt-4 grid gap-2 sm:grid-cols-2">
          {alertPresets.map((preset) => (
            <button
              key={preset.id}
              type="button"
              className="interactive-row text-left disabled:opacity-60"
              disabled={!detail || mutating}
              onClick={() => handleCreateAlert(preset.rule_type, preset.level, preset.note)}
            >
              <div className="text-sm font-medium text-white">{preset.label}</div>
              <div className="mt-1 text-xs text-slate-500">{preset.note}</div>
            </button>
          ))}
        </div>

        <div className="mt-4 space-y-2">
          {detail?.alerts.length ? (
            detail.alerts.map((alert) => {
              const tone = alertTone(alert.rule_type, alert.level, currentPrice);

              return (
                <div key={alert.id} className="interactive-row">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="text-sm font-semibold text-white">
                        {alert.symbol} {formatRule(alert.rule_type)}
                      </div>
                      <div className="mt-1 text-xs text-slate-500">
                        {formatHorizon(alert.horizon)} @ {alert.level.toFixed(2)}
                      </div>
                    </div>
                    <div className={`rounded-full border px-2 py-1 text-xs ${tone.className}`}>
                      {tone.label}
                    </div>
                  </div>
                  <div className="mt-3 flex items-center justify-between gap-3">
                    <div className="text-xs leading-5 text-slate-400">
                      {alert.note || "Saved desk alert."}
                    </div>
                    <button
                      type="button"
                      className="rounded-[12px] border border-white/10 px-2 py-1 text-xs text-slate-300 transition hover:border-white/20"
                      onClick={() => handleDeleteAlert(alert.id)}
                    >
                      Delete
                    </button>
                  </div>
                </div>
              );
            })
          ) : (
            <div className="interactive-row text-sm text-slate-300">
              No alert rules saved yet. Use the active engine levels to save a breakout, breakdown, or VWAP reclaim trigger.
            </div>
          )}
        </div>
      </section>

      <section
        className={`terminal-panel reveal-up reveal-delay-3 p-4 lg:p-5 ${
          activeTab === "memo" ? "" : "hidden"
        }`}
      >
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="eyebrow">Research Memory</div>
            <div className="mt-2 text-lg font-semibold text-white">Source-linked note</div>
          </div>
          <div className="text-right text-xs text-slate-500">
            {detail?.memo.updated_at ? `Saved ${formatTime(detail.memo.updated_at)}` : "Draft only"}
          </div>
        </div>

        <div className="mt-4 grid gap-3">
          <textarea
            className="text-input min-h-[78px] resize-y"
            placeholder="Thesis"
            value={memoDraft.thesis}
            onChange={(event) => setMemoDraft((current) => ({ ...current, thesis: event.target.value }))}
          />
          <textarea
            className="text-input min-h-[78px] resize-y"
            placeholder="Setup"
            value={memoDraft.setup}
            onChange={(event) => setMemoDraft((current) => ({ ...current, setup: event.target.value }))}
          />
          <textarea
            className="text-input min-h-[78px] resize-y"
            placeholder="Risks"
            value={memoDraft.risks}
            onChange={(event) => setMemoDraft((current) => ({ ...current, risks: event.target.value }))}
          />
          <textarea
            className="text-input min-h-[78px] resize-y"
            placeholder="Invalidation"
            value={memoDraft.invalidation}
            onChange={(event) =>
              setMemoDraft((current) => ({ ...current, invalidation: event.target.value }))
            }
          />
          <textarea
            className="text-input min-h-[88px] resize-y"
            placeholder="Execution plan"
            value={memoDraft.execution_plan}
            onChange={(event) =>
              setMemoDraft((current) => ({ ...current, execution_plan: event.target.value }))
            }
          />
        </div>

        <div className="mt-4 flex flex-wrap gap-2">
          <button type="button" className="action-button-secondary" onClick={attachCurrentSources}>
            Attach Current Sources
          </button>
          <button
            type="button"
            className="action-button"
            disabled={!detail || mutating}
            onClick={handleSaveMemo}
          >
            Save Memo
          </button>
        </div>

        <div className="mt-4 space-y-2">
          {memoDraft.source_links.length ? (
            memoDraft.source_links.map((item) => (
              <div key={item.url} className="interactive-row">
                <div className="flex items-start justify-between gap-3">
                  <a
                    href={item.url}
                    target="_blank"
                    rel="noreferrer"
                    className="min-w-0 flex-1 text-sm font-medium text-cyan-200 underline underline-offset-4"
                  >
                    {item.label}
                  </a>
                  <button
                    type="button"
                    className="rounded-[12px] border border-white/10 px-2 py-1 text-xs text-slate-300 transition hover:border-white/20"
                    onClick={() => removeSource(item.url)}
                  >
                    Remove
                  </button>
                </div>
                <div className="mt-1 text-xs uppercase tracking-[0.16em] text-slate-500">
                  {item.kind}
                </div>
              </div>
            ))
          ) : (
            <div className="interactive-row text-sm text-slate-300">
              No sources attached yet. Pull in the current catalyst set before saving the memo.
            </div>
          )}
        </div>
      </section>

      {loading ? (
        <div className="frame-shell border-cyan-500/20 bg-cyan-500/10 px-4 py-3 text-sm text-cyan-100">
          Loading workspace layer...
        </div>
      ) : null}

      {error ? (
        <div className="frame-shell border-rose-500/20 bg-rose-500/10 px-4 py-3 text-sm text-rose-200">
          {error}
        </div>
      ) : null}
    </aside>
  );
}
