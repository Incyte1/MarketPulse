"use client";

import { useMemo, useState } from "react";
import type { AnalysisResponse, InterpretedArticle } from "@/lib/api";

type Props = {
  analysis: AnalysisResponse;
  horizon?: "short_term" | "long_term";
};

type DetailTab = "overview" | "eli5";
type InsightTab = "focus" | "ticker" | "macro" | "context";

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

function ArticleWorkspace({
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
  const [detailTab, setDetailTab] = useState<DetailTab>("overview");

  const activeArticle = articles[selectedIndex] ?? null;

  if (!articles.length || !activeArticle) {
    return (
      <div className="interactive-row text-sm text-slate-300">
        No catalysts are available for the active stream.
      </div>
    );
  }

  return (
    <div className="grid h-full gap-3 xl:grid-cols-[320px_minmax(0,1fr)]">
      <div className="sub-surface flex h-full min-h-[360px] flex-col overflow-hidden">
        <div className="flex items-center justify-between border-b border-white/8 px-4 py-3">
          <div>
            <div className="eyebrow">Article Queue</div>
            <div className="mt-1 text-sm text-[var(--text-soft)]">{articles.length} live items</div>
          </div>
          <span className="desk-chip mono">{symbol}</span>
        </div>

        <div className="flex-1 space-y-1 overflow-y-auto p-2">
          {articles.map((article, index) => (
            <button
              key={articleKey(article, index)}
              type="button"
              className={`interactive-row w-full rounded-[18px] px-3 py-3 text-left ${
                selectedIndex === index ? "border-[var(--accent)]/30 bg-[var(--accent)]/10" : ""
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

      <div className="sub-surface flex h-full min-h-[360px] flex-col overflow-hidden">
        <div className="flex flex-col gap-3 border-b border-white/8 px-4 py-4 lg:flex-row lg:items-start lg:justify-between">
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
              <span className="rounded-full border border-white/10 bg-white/[0.04] px-2 py-1 text-[11px] text-slate-300">
                {prettyLabel(activeArticle.article_type)}
              </span>
            </div>
            <div className="mt-3 text-lg font-semibold text-white">{activeArticle.title}</div>
            <div className="mt-2 text-sm text-[var(--text-soft)]">
              {activeArticle.source || "Unknown"} | {formatTime(activeArticle.published_at)}
            </div>
          </div>

          <div className="flex items-center gap-2">
            <div className="inline-flex rounded-[16px] border border-white/8 bg-black/20 p-1">
              <button
                type="button"
                className={`surface-tab ${detailTab === "overview" ? "surface-tab-active" : ""}`}
                onClick={() => setDetailTab("overview")}
              >
                Overview
              </button>
              <button
                type="button"
                className={`surface-tab ${detailTab === "eli5" ? "surface-tab-active" : ""}`}
                onClick={() => setDetailTab("eli5")}
              >
                Plain English
              </button>
            </div>
            {activeArticle.url ? (
              <a
                href={activeArticle.url}
                target="_blank"
                rel="noreferrer"
                className="action-button-secondary"
              >
                Read
              </a>
            ) : null}
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-4">
          {detailTab === "overview" ? (
            <div className="grid gap-3 xl:grid-cols-[minmax(0,1fr)_320px]">
              <div className="space-y-3">
                <div className="sub-surface px-4 py-4">
                  <div className="field-label">Why It Matters</div>
                  <div className="mt-3 text-sm leading-7 text-slate-200">
                    {articleSummary(activeArticle, symbol)}
                  </div>
                </div>
                <div className="sub-surface px-4 py-4">
                  <div className="field-label">Trade Relevance</div>
                  <div className="mt-3 text-sm leading-7 text-slate-200">
                    {activeArticle.trade_relevance ||
                      `Use this item as context for ${symbol} until price confirms the setup.`}
                  </div>
                </div>
              </div>

              <div className="space-y-3">
                <div className="sub-surface border-emerald-500/15 bg-emerald-500/5 px-4 py-4">
                  <div className="field-label text-emerald-300">Confirmation</div>
                  <div className="mt-3 text-sm leading-7 text-slate-200">
                    {activeArticle.confirmation_to_watch ||
                      `Wait for price confirmation before escalating this headline into an active ${symbol} trade.`}
                  </div>
                </div>
                <div className="sub-surface border-rose-500/15 bg-rose-500/5 px-4 py-4">
                  <div className="field-label text-rose-300">Invalidation</div>
                  <div className="mt-3 text-sm leading-7 text-slate-200">
                    {activeArticle.invalidation_to_watch ||
                      `If price rejects the move, keep this headline as background context instead of a live signal.`}
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="sub-surface border-cyan-500/15 bg-cyan-500/5 px-5 py-5 text-sm leading-7 text-slate-100">
              {activeArticle.explanation ||
                `Simple version: this story matters only if the chart starts confirming it for ${symbol}.`}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function InsightPanels({ analysis, horizon = "short_term" }: Props) {
  const [activeTab, setActiveTab] = useState<InsightTab>("focus");
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
    ];

    if (tickerCatalysts[0]) {
      items.push({
        id: "ticker",
        label: "Ticker",
        title: tickerCatalysts[0].title,
        body: articleSummary(tickerCatalysts[0], analysis.symbol),
        tone: toneBadge(tickerCatalysts[0].direction),
      });
    }

    if (macroDrivers[0]) {
      items.push({
        id: "macro",
        label: "Macro",
        title: macroDrivers[0].title,
        body: articleSummary(macroDrivers[0], analysis.symbol),
        tone: toneBadge(macroDrivers[0].direction),
      });
    }

    return items;
  }, [analysis, horizon, macroDrivers, tickerCatalysts]);

  return (
    <section className="frame-shell reveal-up reveal-delay-3 overflow-hidden p-0">
      <div className="flex flex-col gap-4 border-b border-white/8 px-4 py-4 lg:flex-row lg:items-center lg:justify-between lg:px-5">
        <div>
          <div className="eyebrow">Research Terminal</div>
          <div className="mt-1 text-lg font-semibold text-white">Catalysts, thesis, and context</div>
        </div>

        <div className="inline-flex rounded-[16px] border border-white/8 bg-black/20 p-1">
          {(["focus", "ticker", "macro", "context"] as InsightTab[]).map((tab) => (
            <button
              key={tab}
              type="button"
              className={`surface-tab ${activeTab === tab ? "surface-tab-active" : ""}`}
              onClick={() => setActiveTab(tab)}
            >
              {tab === "focus"
                ? "Focus"
                : tab === "ticker"
                  ? "Ticker Catalysts"
                  : tab === "macro"
                    ? "Macro Drivers"
                    : "Trade Context"}
            </button>
          ))}
        </div>
      </div>

      <div className="p-3 lg:p-4">
        {activeTab === "focus" ? (
          <div className="grid gap-3 xl:grid-cols-[minmax(0,1.08fr)_0.92fr]">
            <div className="sub-surface px-4 py-4">
              <div className="field-label">Professional Read</div>
              <div className="mt-3 text-sm leading-8 text-slate-100">
                {analysis.professional_analysis.executive_summary ||
                  "No executive summary is available yet."}
              </div>

              <div className="mt-4 sub-surface px-4 py-4">
                <div className="field-label">Plain English</div>
                <div className="mt-3 text-sm leading-7 text-slate-200">
                  {analysis.professional_analysis.plain_english_summary ||
                    "No plain-English summary is available yet."}
                </div>
              </div>
            </div>

            <div className="grid gap-3">
              {focusItems.map((item) => (
                <div key={item.id} className="sub-surface px-4 py-4">
                  <div className="flex items-center gap-2">
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
          <ArticleWorkspace
            key={`ticker-${analysis.symbol}-${safeTickerIndex}`}
            articles={tickerCatalysts}
            symbol={analysis.symbol}
            selectedIndex={safeTickerIndex}
            onSelect={setSelectedTickerIndex}
          />
        ) : null}

        {activeTab === "macro" ? (
          <ArticleWorkspace
            key={`macro-${analysis.symbol}-${safeMacroIndex}`}
            articles={macroDrivers}
            symbol={analysis.symbol}
            selectedIndex={safeMacroIndex}
            onSelect={setSelectedMacroIndex}
          />
        ) : null}

        {activeTab === "context" ? (
          <div className="grid gap-3 xl:grid-cols-[minmax(0,0.9fr)_1.1fr]">
            <div className="space-y-3">
              <div className="sub-surface px-4 py-4">
                <div className="field-label">Market Context</div>
                <div className="mt-4 grid gap-3">
                  <div>
                    <div className="field-label">Regime</div>
                    <div className="mt-2 text-sm leading-7 text-slate-200">
                      {prettyLabel(analysis.professional_analysis.regime)} |{" "}
                      {prettyLabel(technical.regime_state)}
                    </div>
                  </div>
                  <div>
                    <div className="field-label">Volatility</div>
                    <div className="mt-2 text-sm leading-7 text-slate-200">
                      {prettyLabel(technical.volatility_state)} | ATR {technical.atr?.toFixed(2) ?? "n/a"}
                    </div>
                  </div>
                  <div>
                    <div className="field-label">Momentum</div>
                    <div className="mt-2 text-sm leading-7 text-slate-200">
                      {prettyLabel(technical.momentum_state)} | MACD {technical.macd?.toFixed(4) ?? "n/a"}
                    </div>
                  </div>
                </div>
              </div>

              <div className="sub-surface px-4 py-4">
                <div className="field-label">Confirmation</div>
                <div className="mt-3 text-sm leading-7 text-slate-200">
                  {analysis.professional_analysis.confirmation.length
                    ? analysis.professional_analysis.confirmation.join(" | ")
                    : "No confirmation factors are listed."}
                </div>
              </div>

              <div className="sub-surface px-4 py-4">
                <div className="field-label">Invalidation</div>
                <div className="mt-3 text-sm leading-7 text-slate-200">
                  {analysis.professional_analysis.invalidation.length
                    ? analysis.professional_analysis.invalidation.join(" | ")
                    : "No invalidation factors are listed."}
                </div>
              </div>
            </div>

            <div className="sub-surface px-4 py-4">
              <div className="field-label">Technical Stack</div>
              <div className="mt-4 grid gap-2 md:grid-cols-2">
                <div className="sub-surface px-4 py-4">
                  <div className="field-label">Engine</div>
                  <div className="mt-2 text-sm leading-7 text-slate-200">
                    {technical.data_range || "n/a"} using {technical.data_source_interval || "n/a"} bars
                    <br />
                    {technical.calibration_window || "Calibration unavailable"}
                  </div>
                </div>
                <div className="sub-surface px-4 py-4">
                  <div className="field-label">Levels</div>
                  <div className="mt-2 text-sm leading-7 text-slate-200">
                    Support {technical.support_level?.toFixed(2) ?? "n/a"}
                    <br />
                    Resistance {technical.resistance_level?.toFixed(2) ?? "n/a"}
                  </div>
                </div>
                <div className="sub-surface px-4 py-4">
                  <div className="field-label">Trend Stack</div>
                  <div className="mt-2 text-sm leading-7 text-slate-200">
                    {technical.fast_indicator_label || "Fast"} {technical.ema_20?.toFixed(2) ?? "n/a"}
                    <br />
                    {technical.medium_indicator_label || "Medium"} {technical.ema_50?.toFixed(2) ?? "n/a"}
                    <br />
                    {technical.slow_indicator_label || "Slow"} {technical.ema_200?.toFixed(2) ?? "n/a"}
                  </div>
                </div>
                <div className="sub-surface px-4 py-4">
                  <div className="field-label">Scoring</div>
                  <div className="mt-2 text-sm leading-7 text-slate-200">
                    Trend {technical.trend_score ?? "n/a"} | Momentum {technical.momentum_score ?? "n/a"}
                    <br />
                    Level {technical.level_score ?? "n/a"} | Exhaustion {technical.exhaustion_score ?? "n/a"}
                  </div>
                </div>
              </div>

              <div className="mt-3 sub-surface px-4 py-4 text-sm leading-7 text-slate-200">
                VWAP {technical.vwap?.toFixed(2) ?? "n/a"} | Range position{" "}
                {technical.range_position_percent?.toFixed(1) ?? "n/a"}% | StochRSI{" "}
                {technical.stoch_rsi_k?.toFixed(1) ?? "n/a"} / {technical.stoch_rsi_d?.toFixed(1) ?? "n/a"} | Economic pressure{" "}
                {prettyLabel(technical.economic_pressure)}
              </div>
            </div>
          </div>
        ) : null}
      </div>
    </section>
  );
}
