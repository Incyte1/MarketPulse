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
  fetchWorkspaceDetail,
  fetchWorkspaces,
  removeWorkspaceAlert,
  removeWorkspaceSymbol,
  saveWorkspaceMemo,
  type MemoSourceLink,
  type WorkspaceDetailResponse,
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

type DockTab = "overview" | "watchlist" | "alerts" | "memo";

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
  const [memoDraft, setMemoDraft] = useState<MemoDraft>(emptyDraft());
  const [createName, setCreateName] = useState("");
  const [loading, setLoading] = useState(false);
  const [mutating, setMutating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<DockTab>("overview");

  const token = session?.token ?? null;
  const currentPrice = analysis?.price_context.current_price ?? 0;
  const technical = analysis?.technical_context;
  const memoSourceCount = detail?.memo.source_links.length ?? 0;
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

  if (!session) {
    return (
      <aside className="space-y-4 xl:self-start">
        <section className="frame-shell reveal-up reveal-delay-2 p-4 lg:p-5">
          <div className="eyebrow">Workflow Layer</div>
          <div className="mt-2 text-xl font-semibold text-white">Workflow dock</div>
          <p className="mt-3 text-sm leading-6 text-slate-400">
            Sign in to turn the live market surface into a persistent desk with saved workspaces,
            alerts, and source-linked memo flow.
          </p>

          <div className="mt-4 grid gap-2">
            <div className="interactive-row">
              <div className="text-sm font-semibold text-white">Saved workspaces</div>
              <div className="mt-1 text-sm text-slate-400">
                Restore active symbol, horizon, and memo context.
              </div>
            </div>
            <div className="interactive-row">
              <div className="text-sm font-semibold text-white">Alert rules</div>
              <div className="mt-1 text-sm text-slate-400">
                Save breakouts, breakdowns, and VWAP reclaim levels.
              </div>
            </div>
            <div className="interactive-row">
              <div className="text-sm font-semibold text-white">Source-linked memos</div>
              <div className="mt-1 text-sm text-slate-400">
                Build a research note with linked catalysts instead of loose copy.
              </div>
            </div>
          </div>

          <div className="mt-5 flex gap-3">
            <Link href="/login" className="action-button-secondary">
              Login
            </Link>
            <Link href="/register" className="action-button">
              Create {brand.name} Account
            </Link>
          </div>
        </section>
      </aside>
    );
  }

  return (
    <aside className="space-y-4 xl:self-start">
      <section className="frame-shell reveal-up reveal-delay-2 p-4 lg:p-5">
        <div className="flex flex-col gap-3">
          <div className="flex items-start justify-between gap-3">
            <div>
              <div className="eyebrow">Workflow Layer</div>
              <div className="mt-2 text-xl font-semibold text-white">Workflow dock</div>
              <div className="mt-1 text-sm text-slate-400">
                Save desk state, alerts, and memo context without repeating the live market read.
              </div>
            </div>
            {detail ? <div className="desk-chip mono">{detail.workspace.name}</div> : null}
          </div>

          <div className="flex gap-2 overflow-x-auto pb-1">
            {workspaces.map((workspace) => (
              <button
                key={workspace.id}
                type="button"
                className={`min-w-[152px] rounded-[14px] border px-3 py-2 text-left text-sm transition ${
                  activeWorkspaceId === workspace.id
                    ? "border-[var(--accent)]/28 bg-[var(--accent)]/10 text-white"
                    : "border-white/10 bg-white/5 text-slate-300 hover:border-white/20"
                }`}
                onClick={() => setActiveWorkspaceId(workspace.id)}
              >
                <div className="font-medium">{workspace.name}</div>
                <div className="mt-1 text-[11px] uppercase tracking-[0.16em] text-slate-500">
                  {workspace.is_default ? "Default Desk" : formatHorizon(workspace.selected_horizon)}
                </div>
              </button>
            ))}
          </div>

          <div className="flex gap-2">
            <input
              className="text-input"
              placeholder="New desk name"
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

          {detail ? (
            <div className="grid gap-2 sm:grid-cols-3">
              <div className="interactive-row">
                <div className="eyebrow">Watchlist</div>
                <div className="mt-2 text-base font-semibold text-white">
                  {detail.watchlist.length}
                </div>
                <div className="mt-1 text-xs text-slate-500">Tracked symbols</div>
              </div>
              <div className="interactive-row">
                <div className="eyebrow">Alerts</div>
                <div className="mt-2 text-base font-semibold text-white">
                  {detail.alerts.length}
                </div>
                <div className="mt-1 text-xs text-slate-500">Saved triggers</div>
              </div>
              <div className="interactive-row">
                <div className="eyebrow">Memo</div>
                <div className="mt-2 text-base font-semibold text-white">
                  {memoSourceCount}
                </div>
                <div className="mt-1 text-xs text-slate-500">Linked sources</div>
              </div>
            </div>
          ) : null}

          <div className="inline-flex rounded-[16px] border border-white/10 bg-black/20 p-1">
            {(["overview", "watchlist", "alerts", "memo"] as DockTab[]).map((tab) => (
              <button
                key={tab}
                type="button"
                className={`inspector-tab ${activeTab === tab ? "inspector-tab-active" : ""}`}
                onClick={() => setActiveTab(tab)}
              >
                {tab === "overview"
                  ? "Desk"
                  : tab === "watchlist"
                    ? "Watchlist"
                    : tab === "alerts"
                      ? "Alerts"
                      : "Memo"}
              </button>
            ))}
          </div>

          {activeTab === "overview" ? (
            <div className="grid gap-2">
              <div className="interactive-row">
                <div className="text-[11px] uppercase tracking-[0.18em] text-slate-500">
                  Active desk
                </div>
                <div className="mt-2 text-sm leading-7 text-slate-200">
                  {detail
                    ? `${detail.workspace.name} stores the saved watchlist, alert rules, and memo context for this review flow.`
                    : "Workspace detail is loading."}
                </div>
              </div>
              <div className="interactive-row">
                <div className="text-[11px] uppercase tracking-[0.18em] text-slate-500">
                  Last memo save
                </div>
                <div className="mt-2 text-sm leading-7 text-slate-200">
                  {detail?.memo.updated_at
                    ? `Saved ${formatTime(detail.memo.updated_at)} with ${memoSourceCount} linked source${memoSourceCount === 1 ? "" : "s"}.`
                    : "The memo has not been saved yet."}
                </div>
              </div>
            </div>
          ) : null}
        </div>
      </section>

      <section
        className={`frame-shell reveal-up reveal-delay-3 p-4 lg:p-5 ${
          activeTab === "watchlist" ? "" : "hidden"
        }`}
      >
        <div className="flex items-center justify-between gap-3">
          <div>
            <div className="eyebrow">Watchlist</div>
            <div className="mt-2 text-lg font-semibold text-white">Coverage queue</div>
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
        className={`frame-shell reveal-up reveal-delay-3 p-4 lg:p-5 ${
          activeTab === "alerts" ? "" : "hidden"
        }`}
      >
        <div className="flex items-center justify-between gap-3">
          <div>
            <div className="eyebrow">Alerts</div>
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
        className={`frame-shell reveal-up reveal-delay-3 p-4 lg:p-5 ${
          activeTab === "memo" ? "" : "hidden"
        }`}
      >
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="eyebrow">Investment Memo</div>
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
