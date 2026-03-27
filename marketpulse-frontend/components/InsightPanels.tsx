"use client";

import { useMemo, useState } from "react";
import type { AnalysisResponse, InterpretedArticle } from "@/lib/api";

type Props = {
  analysis: AnalysisResponse;
  horizon?: "short_term" | "long_term";
};

type DetailTab = "signal" | "simple";
type InsightTab = "brief" | "ticker" | "macro" | "stack";

type FocusItem = {
  id: string;
  label: string;
  title: string;
  body: string;
  tone: string;
};

function toneBadge(value?: string | null) {
  const normalized = (value || "").toLowerCase();
  if (normalized.includes("bull")) return "border-emerald-500/20 bg-emerald-500/10 text-emerald-300";
  if (normalized.includes("bear")) return "border-rose-500/20 bg-rose-500/10 text-rose-300";
  if (normalized.includes("high")) return "border-amber-500/20 bg-amber-500/10 text-amber-300";
  return "border-white/10 bg-white/[0.04] text-slate-300";
}

function formatTime(value?: string | null) {
  if (!value) return "Unknown time";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return value;
  return parsed.toLocaleString();
}

function prettyLabel(value?: string | null) {
  if (!value) return "Unknown";
  return value.replaceAll("_", " ").replace(/\b\w/g, (match) => match.toUpperCase());
}

function articleKey(article: InterpretedArticle, idx: number) {
  return `${article.title}-${article.published_at ?? "na"}-${idx}`;
}

function articleSummary(article: InterpretedArticle, symbol: string) {
  return (
    article.key_takeaway ||
    article.trade_relevance ||
    article.explanation ||
    `No live catalyst summary is available yet for ${symbol}.`
  );
}

function ArticleConsole({
  articles,
  symbol,
  selectedIndex,
  onSelect,
}: {
  articles: InterpretedArticle[];
  symbol: string;
  selectedIndex: number;
  onSelect: (index: number) => void;
}) {
  const [detailTab, setDetailTab] = useState<DetailTab>("signal");

  const activeArticle = articles[selectedIndex] ?? null;

  if (!articles.length || !activeArticle) {
    return (
      <div className="px-4 py-5 text-sm text-slate-300">
        No catalysts are available for the active stream.
      </div>
    );
  }

  return (
    <div className="grid min-h-[440px] xl:grid-cols-[300px_minmax(0,1fr)]">
      <div className="border-b border-white/8 xl:border-r xl:border-b-0">
        <div className="terminal-header">
          <div>
            <div className="eyebrow">Headline Queue</div>
            <div className="mt-1 text-sm font-semibold text-white">{articles.length} live items</div>
          </div>
          <div className="desk-chip mono">{symbol}</div>
        </div>

        <div className="terminal-list">
          {articles.map((article, index) => (
            <button
              key={articleKey(article, index)}
              type="button"
              className={`terminal-row w-full text-left transition ${
                selectedIndex === index ? "terminal-row-active" : "hover:bg-white/[0.025]"
              }`}
              onClick={() => onSelect(index)}
            >
              <div className="flex flex-wrap items-center gap-2">
                <span className={`rounded-full border px-2 py-1 text-[11px] ${toneBadge(article.direction)}`}>
                  {prettyLabel(article.direction)}
                </span>
                <span
                  className={`rounded-full border px-2 py-1 text-[11px] ${toneBadge(
                    article.importance || article.impact
                  )}`}
                >
                  {prettyLabel(article.importance || article.impact)}
                </span>
              </div>
              <div className="mt-3 text-sm font-semibold text-white">{article.title}</div>
              <div className="mt-2 text-xs text-[var(--text-soft)]">
                {article.source || "Unknown"} | {formatTime(article.published_at)}
              </div>
            </button>
          ))}
        </div>
      </div>

      <div className="min-w-0">
        <div className="terminal-header">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <span className={`rounded-full border px-2 py-1 text-[11px] ${toneBadge(activeArticle.direction)}`}>
                {prettyLabel(activeArticle.direction)}
              </span>
              <span
                className={`rounded-full border px-2 py-1 text-[11px] ${toneBadge(
                  activeArticle.importance || activeArticle.impact
                )}`}
              >
                {prettyLabel(activeArticle.importance || activeArticle.impact)}
              </span>
              <span className="terminal-pill">{prettyLabel(activeArticle.article_type)}</span>
            </div>
            <div className="mt-3 text-lg font-semibold text-white">{activeArticle.title}</div>
            <div className="mt-2 text-sm text-[var(--text-soft)]">
              {activeArticle.source || "Unknown"} | {formatTime(activeArticle.published_at)}
            </div>
          </div>

          <div className="flex items-center gap-2">
            <div className="segmented-shell">
              <button
                type="button"
                className={`surface-tab ${detailTab === "signal" ? "surface-tab-active" : ""}`}
                onClick={() => setDetailTab("signal")}
              >
                Signal
              </button>
              <button
                type="button"
                className={`surface-tab ${detailTab === "simple" ? "surface-tab-active" : ""}`}
                onClick={() => setDetailTab("simple")}
              >
                Plain
              </button>
            </div>

            {activeArticle.url ? (
              <a
                href={activeArticle.url}
                target="_blank"
                rel="noreferrer"
                className="action-button-secondary"
              >
                Read Source
              </a>
            ) : null}
          </div>
        </div>

        {detailTab === "signal" ? (
          <div className="grid gap-0 xl:grid-cols-[minmax(0,1fr)_300px]">
            <div className="terminal-list">
              <div className="terminal-row">
                <div className="terminal-kpi-label">Why It Matters</div>
                <div className="mt-3 text-sm leading-7 text-slate-200">
                  {articleSummary(activeArticle, symbol)}
                </div>
              </div>
              <div className="terminal-row">
                <div className="terminal-kpi-label">Trade Relevance</div>
                <div className="mt-3 text-sm leading-7 text-slate-200">
                  {activeArticle.trade_relevance ||
                    `Use this item as context for ${symbol} until price confirms the setup.`}
                </div>
              </div>
              <div className="terminal-row">
                <div className="terminal-kpi-label">Impact Scope</div>
                <div className="mt-3 text-sm leading-7 text-slate-200">
                  {activeArticle.impact_area?.length
                    ? activeArticle.impact_area.join(" | ")
                    : `Impact scope has not been assigned yet for ${symbol}.`}
                </div>
              </div>
            </div>

            <div className="border-t border-white/8 xl:border-t-0 xl:border-l">
              <div className="terminal-row">
                <div className="terminal-kpi-label">Confirmation</div>
                <div className="mt-3 text-sm leading-7 text-slate-200">
                  {activeArticle.confirmation_to_watch ||
                    `Wait for price confirmation before escalating this headline into an active ${symbol} trade.`}
                </div>
              </div>
              <div className="terminal-row">
                <div className="terminal-kpi-label">Invalidation</div>
                <div className="mt-3 text-sm leading-7 text-slate-200">
                  {activeArticle.invalidation_to_watch ||
                    `If price rejects the move, keep this headline as background context instead of a live signal.`}
                </div>
              </div>
              <div className="terminal-row">
                <div className="terminal-kpi-label">Time Horizon</div>
                <div className="mt-3 text-sm leading-7 text-slate-200">
                  {prettyLabel(activeArticle.time_horizon)} | {prettyLabel(activeArticle.market_scope)}
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="px-4 py-5 text-sm leading-7 text-slate-100 sm:px-5">
            {activeArticle.explanation ||
              `Simple version: this story matters only if the chart starts confirming it for ${symbol}.`}
          </div>
        )}
      </div>
    </div>
  );
}

export default function InsightPanels({ analysis, horizon = "short_term" }: Props) {
  const [activeTab, setActiveTab] = useState<InsightTab>("brief");
  const [selectedTickerIndex, setSelectedTickerIndex] = useState(0);
  const [selectedMacroIndex, setSelectedMacroIndex] = useState(0);

  const tickerCatalysts = useMemo(
    () => analysis.interpreted_ticker_news ?? [],
    [analysis.interpreted_ticker_news]
  );
  const macroDrivers = useMemo(
    () => analysis.interpreted_macro_news ?? [],
    [analysis.interpreted_macro_news]
  );
  const technical = analysis.technical_context;
  const safeTickerIndex = tickerCatalysts[selectedTickerIndex] ? selectedTickerIndex : 0;
  const safeMacroIndex = macroDrivers[selectedMacroIndex] ? selectedMacroIndex : 0;

  const focusItems = useMemo<FocusItem[]>(() => {
    const items: FocusItem[] = [
      {
        id: "setup",
        label: horizon === "short_term" ? "Setup" : "Thesis",
        title: analysis.guidance.headline || "Current setup",
        body: analysis.guidance.summary || "No live setup summary is available.",
        tone: toneBadge(analysis.bias.label),
      },
      {
        id: "stance",
        label: "Stance",
        title: prettyLabel(analysis.guidance.preferred_direction),
        body:
          analysis.professional_analysis.tactical_stance ||
          "Tactical stance will populate once the engine finishes the read.",
        tone: toneBadge(analysis.bias.confidence_label),
      },
      {
        id: "driver",
        label: "Driver",
        title: prettyLabel(analysis.professional_analysis.primary_driver),
        body: analysis.professional_analysis.secondary_drivers.length
          ? analysis.professional_analysis.secondary_drivers.join(" | ")
          : "No secondary drivers are listed for the current read.",
        tone: "border-white/10 bg-white/[0.04] text-slate-200",
      },
    ];

    if (tickerCatalysts[0]) {
      items.push({
        id: "ticker",
        label: "Ticker Feed",
        title: tickerCatalysts[0].title,
        body: articleSummary(tickerCatalysts[0], analysis.symbol),
        tone: toneBadge(tickerCatalysts[0].direction),
      });
    }

    if (macroDrivers[0]) {
      items.push({
        id: "macro",
        label: "Macro Feed",
        title: macroDrivers[0].title,
        body: articleSummary(macroDrivers[0], analysis.symbol),
        tone: toneBadge(macroDrivers[0].direction),
      });
    }

    return items;
  }, [analysis, horizon, macroDrivers, tickerCatalysts]);

  return (
    <section className="terminal-panel reveal-up reveal-delay-3 overflow-hidden">
      <div className="terminal-header">
        <div>
          <div className="eyebrow">Research Console</div>
          <div className="mt-1 text-base font-semibold text-white">
            Catalyst tape, model context, and technical stack
          </div>
        </div>

        <div className="segmented-shell">
          {(["brief", "ticker", "macro", "stack"] as InsightTab[]).map((tab) => (
            <button
              key={tab}
              type="button"
              className={`surface-tab ${activeTab === tab ? "surface-tab-active" : ""}`}
              onClick={() => setActiveTab(tab)}
            >
              {tab === "brief"
                ? "Brief"
                : tab === "ticker"
                  ? "Ticker Feed"
                  : tab === "macro"
                    ? "Macro Feed"
                    : "Model Stack"}
            </button>
          ))}
        </div>
      </div>

      {activeTab === "brief" ? (
        <div className="grid xl:grid-cols-[minmax(0,1.15fr)_0.85fr]">
          <div className="terminal-list border-b border-white/8 xl:border-r xl:border-b-0">
            <div className="terminal-row">
              <div className="terminal-kpi-label">Executive Summary</div>
              <div className="mt-3 text-sm leading-8 text-slate-100">
                {analysis.professional_analysis.executive_summary ||
                  "No executive summary is available yet."}
              </div>
            </div>
            <div className="terminal-row">
              <div className="terminal-kpi-label">Plain English</div>
              <div className="mt-3 text-sm leading-7 text-slate-200">
                {analysis.professional_analysis.plain_english_summary ||
                  "No plain-English summary is available yet."}
              </div>
            </div>
            <div className="terminal-row">
              <div className="terminal-kpi-label">Warning Set</div>
              <div className="mt-3 space-y-2">
                {(analysis.guidance.warnings.length
                  ? analysis.guidance.warnings
                  : ["No active warning set."]).map((item) => (
                  <div key={item} className="terminal-note">
                    {item}
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="terminal-list">
            {focusItems.map((item) => (
              <div key={item.id} className="terminal-row">
                <div className="flex flex-wrap items-center gap-2">
                  <span className={`rounded-full border px-2 py-1 text-[11px] ${item.tone}`}>
                    {item.label}
                  </span>
                </div>
                <div className="mt-3 text-base font-semibold text-white">{item.title}</div>
                <div className="mt-3 text-sm leading-7 text-slate-300">{item.body}</div>
              </div>
            ))}
          </div>
        </div>
      ) : null}

      {activeTab === "ticker" ? (
        <ArticleConsole
          key={`ticker-${analysis.symbol}-${safeTickerIndex}`}
          articles={tickerCatalysts}
          symbol={analysis.symbol}
          selectedIndex={safeTickerIndex}
          onSelect={setSelectedTickerIndex}
        />
      ) : null}

      {activeTab === "macro" ? (
        <ArticleConsole
          key={`macro-${analysis.symbol}-${safeMacroIndex}`}
          articles={macroDrivers}
          symbol={analysis.symbol}
          selectedIndex={safeMacroIndex}
          onSelect={setSelectedMacroIndex}
        />
      ) : null}

      {activeTab === "stack" ? (
        <div className="terminal-pair-grid md:grid-cols-2 xl:grid-cols-3">
          <div className="terminal-pair">
            <div>
              <div className="terminal-kpi-label">Regime</div>
              <div className="mt-2 text-sm text-white">
                {prettyLabel(analysis.professional_analysis.regime)}
              </div>
            </div>
            <div className="text-sm text-[var(--text-soft)]">{prettyLabel(technical.regime_state)}</div>
          </div>

          <div className="terminal-pair">
            <div>
              <div className="terminal-kpi-label">Volatility</div>
              <div className="mt-2 text-sm text-white">
                {prettyLabel(technical.volatility_state)}
              </div>
            </div>
            <div className="text-sm text-[var(--text-soft)]">ATR {technical.atr?.toFixed(2) ?? "n/a"}</div>
          </div>

          <div className="terminal-pair">
            <div>
              <div className="terminal-kpi-label">Momentum</div>
              <div className="mt-2 text-sm text-white">
                {prettyLabel(technical.momentum_state)}
              </div>
            </div>
            <div className="text-sm text-[var(--text-soft)]">MACD {technical.macd?.toFixed(4) ?? "n/a"}</div>
          </div>

          <div className="terminal-pair">
            <div>
              <div className="terminal-kpi-label">Levels</div>
              <div className="mt-2 text-sm text-white">
                {technical.support_level?.toFixed(2) ?? "n/a"} /{" "}
                {technical.resistance_level?.toFixed(2) ?? "n/a"}
              </div>
            </div>
            <div className="text-sm text-[var(--text-soft)]">
              VWAP {technical.vwap?.toFixed(2) ?? "n/a"}
            </div>
          </div>

          <div className="terminal-pair">
            <div>
              <div className="terminal-kpi-label">Trend Stack</div>
              <div className="mt-2 text-sm text-white">
                {technical.fast_indicator_label || "Fast"} {technical.ema_20?.toFixed(2) ?? "n/a"}
              </div>
            </div>
            <div className="text-sm text-[var(--text-soft)]">
              {technical.medium_indicator_label || "Medium"} {technical.ema_50?.toFixed(2) ?? "n/a"}
            </div>
          </div>

          <div className="terminal-pair">
            <div>
              <div className="terminal-kpi-label">Range Position</div>
              <div className="mt-2 text-sm text-white">
                {technical.range_position_percent?.toFixed(1) ?? "n/a"}%
              </div>
            </div>
            <div className="text-sm text-[var(--text-soft)]">
              Stoch {technical.stoch_rsi_k?.toFixed(1) ?? "n/a"} /{" "}
              {technical.stoch_rsi_d?.toFixed(1) ?? "n/a"}
            </div>
          </div>

          <div className="terminal-pair">
            <div>
              <div className="terminal-kpi-label">Scoring</div>
              <div className="mt-2 text-sm text-white">
                Trend {technical.trend_score ?? "n/a"} | Momentum {technical.momentum_score ?? "n/a"}
              </div>
            </div>
            <div className="text-sm text-[var(--text-soft)]">
              Structure {technical.structure_score ?? "n/a"} | Level {technical.level_score ?? "n/a"}
            </div>
          </div>

          <div className="terminal-pair">
            <div>
              <div className="terminal-kpi-label">Calibration</div>
              <div className="mt-2 text-sm text-white">
                {technical.calibration_window || "Calibration unavailable"}
              </div>
            </div>
            <div className="text-sm text-[var(--text-soft)]">
              {technical.data_range || "n/a"} | {technical.data_source_interval || "n/a"}
            </div>
          </div>

          <div className="terminal-pair">
            <div>
              <div className="terminal-kpi-label">Economic Pressure</div>
              <div className="mt-2 text-sm text-white">
                {prettyLabel(technical.economic_pressure)}
              </div>
            </div>
            <div className="text-sm text-[var(--text-soft)]">
              {analysis.professional_analysis.secondary_drivers.length
                ? analysis.professional_analysis.secondary_drivers[0]
                : "secondary factors pending"}
            </div>
          </div>
        </div>
      ) : null}
    </section>
  );
}
