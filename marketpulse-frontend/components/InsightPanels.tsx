"use client";

import { useMemo, useState } from "react";
import type { AnalysisResponse, InterpretedArticle } from "@/lib/api";

type Props = {
  analysis: AnalysisResponse;
  horizon?: "short_term" | "long_term";
};

type CardTab = "overview" | "eli5";

function toneClass(value?: string | null) {
  const v = (value || "").toLowerCase();

  if (v.includes("bull")) return "border-emerald-500/20 bg-emerald-500/10 text-emerald-300";
  if (v.includes("bear")) return "border-rose-500/20 bg-rose-500/10 text-rose-300";
  if (v.includes("high")) return "border-amber-500/20 bg-amber-500/10 text-amber-300";
  return "border-white/10 bg-white/5 text-slate-300";
}

function fmtTime(value?: string | null) {
  if (!value) return "Unknown time";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value;
  return d.toLocaleString();
}

function keyForArticle(article: InterpretedArticle, idx: number) {
  return `${article.title}-${article.published_at ?? "na"}-${idx}`;
}

function eli5(article: InterpretedArticle, symbol: string) {
  const why = article.key_takeaway || article.explanation || "This is a market story that may matter.";
  const trade = article.trade_relevance || "Traders are watching to see whether price agrees with the story.";

  return `ELI5: Something happened in the market, and people think it could affect ${symbol}. ${why} In simple terms, ${trade}`;
}

function ArticleCard({
  article,
  idx,
  symbol,
}: {
  article: InterpretedArticle;
  idx: number;
  symbol: string;
}) {
  const [tab, setTab] = useState<CardTab>("overview");

  return (
    <div
      key={keyForArticle(article, idx)}
      className="rounded-2xl border border-white/10 bg-[#0b1323] p-4"
    >
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <span className={`rounded-full border px-2 py-1 text-xs ${toneClass(article.direction)}`}>
          {article.direction}
        </span>

        <span className={`rounded-full border px-2 py-1 text-xs ${toneClass(article.importance || article.impact)}`}>
          {article.importance || article.impact}
        </span>

        <span className="rounded-full border border-white/10 bg-white/5 px-2 py-1 text-xs text-slate-300">
          {article.article_type}
        </span>

        <span className="rounded-full border border-white/10 bg-white/5 px-2 py-1 text-xs text-slate-300">
          {article.time_horizon || "short_term"}
        </span>

        <div className="ml-auto inline-flex rounded-xl border border-white/10 bg-white/5 p-1">
          <button
            className={`rounded-lg px-3 py-1 text-xs ${tab === "overview" ? "bg-white text-black" : "text-slate-300"}`}
            onClick={() => setTab("overview")}
          >
            Overview
          </button>
          <button
            className={`rounded-lg px-3 py-1 text-xs ${tab === "eli5" ? "bg-emerald-500 text-black" : "text-slate-300"}`}
            onClick={() => setTab("eli5")}
          >
            Explain Like I’m 5
          </button>
        </div>
      </div>

      <div className="text-base font-semibold text-white">
        {article.title}
      </div>

      <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-slate-400">
        <span>{article.source || "Unknown"}</span>
        <span>·</span>
        <span>{fmtTime(article.published_at)}</span>
        {article.url ? (
          <>
            <span>·</span>
            <a
              href={article.url}
              target="_blank"
              rel="noreferrer"
              className="text-cyan-300 underline underline-offset-4"
            >
              Read article
            </a>
          </>
        ) : null}
      </div>

      {tab === "overview" ? (
        <div className="mt-3 space-y-3">
          <div>
            <div className="text-[11px] uppercase tracking-[0.18em] text-slate-500">Why it matters</div>
            <div className="mt-1 text-sm text-slate-200">
              {article.key_takeaway || article.explanation || "No catalyst summary available."}
            </div>
          </div>

          {article.trade_relevance ? (
            <div>
              <div className="text-[11px] uppercase tracking-[0.18em] text-slate-500">Trade relevance</div>
              <div className="mt-1 text-sm text-slate-200">
                {article.trade_relevance}
              </div>
            </div>
          ) : null}

          <div className="grid gap-3 md:grid-cols-2">
            <div className="rounded-xl border border-emerald-500/15 bg-emerald-500/5 p-3">
              <div className="text-[11px] uppercase tracking-[0.18em] text-emerald-300">
                Confirmation
              </div>
              <div className="mt-1 text-sm text-slate-200">
                {article.confirmation_to_watch || "No grounded confirmation level is available yet."}
              </div>
            </div>

            <div className="rounded-xl border border-rose-500/15 bg-rose-500/5 p-3">
              <div className="text-[11px] uppercase tracking-[0.18em] text-rose-300">
                Invalidation
              </div>
              <div className="mt-1 text-sm text-slate-200">
                {article.invalidation_to_watch || "No grounded invalidation level is available yet."}
              </div>
            </div>
          </div>

          <div className="rounded-xl border border-white/10 bg-white/5 p-3">
            <div className="text-[11px] uppercase tracking-[0.18em] text-slate-500">
              Support / Resistance
            </div>
            <div className="mt-1 text-sm text-slate-300">
              Exact support and resistance prices are not available in the current backend response yet, so MarketPulse is not guessing here.
            </div>
          </div>
        </div>
      ) : (
        <div className="mt-3 rounded-xl border border-cyan-500/15 bg-cyan-500/5 p-4 text-sm text-slate-100">
          {eli5(article, symbol)}
        </div>
      )}
    </div>
  );
}

export default function InsightPanels({ analysis, horizon = "short_term" }: Props) {
  const tickerCatalysts = analysis.interpreted_ticker_news ?? [];
  const macroDrivers = analysis.interpreted_macro_news ?? [];

  const topDrivers = useMemo(
    () => [...tickerCatalysts, ...macroDrivers].slice(0, 3),
    [tickerCatalysts, macroDrivers]
  );

  const horizonText =
    horizon === "short_term"
      ? "Short-term read for timing, intraday reaction, and near-term follow-through."
      : "Long-term read for structure, trend, and bigger-picture positioning.";

  return (
    <div className="grid gap-6 xl:grid-cols-[1.6fr_1fr]">
      <div className="space-y-6">
        <section className="panel p-5">
          <div className="mb-4">
            <div className="text-xl font-semibold">Professional Read</div>
            <div className="mt-2 text-sm text-slate-400">{horizonText}</div>
            <div className="mt-3 text-sm text-slate-300">
              {analysis.professional_analysis?.executive_summary || "No executive summary available."}
            </div>
          </div>

          <div className="rounded-2xl border border-white/10 bg-[#0b1323] p-4">
            <div className="text-[11px] uppercase tracking-[0.18em] text-slate-500">
              Plain English
            </div>
            <div className="mt-2 text-sm text-slate-200">
              {analysis.professional_analysis?.plain_english_summary || "No plain-English summary available."}
            </div>
          </div>

          <div className="mt-4 grid gap-3 md:grid-cols-2">
            <div className="rounded-2xl border border-white/10 bg-[#0b1323] p-4">
              <div className="text-[11px] uppercase tracking-[0.18em] text-slate-500">
                Tactical stance
              </div>
              <div className="mt-2 text-sm text-slate-200">
                {analysis.professional_analysis?.tactical_stance || "No tactical stance available."}
              </div>
            </div>

            <div className="rounded-2xl border border-white/10 bg-[#0b1323] p-4">
              <div className="text-[11px] uppercase tracking-[0.18em] text-slate-500">
                Key risks
              </div>
              <div className="mt-2 text-sm text-slate-200">
                {(analysis.professional_analysis?.key_risks || []).length
                  ? analysis.professional_analysis.key_risks.join(" • ")
                  : "No key risks available."}
              </div>
            </div>
          </div>
        </section>

        <section className="panel p-5">
          <div className="mb-4">
            <div className="text-xl font-semibold">What Matters Now</div>
            <div className="mt-2 text-sm text-slate-400">
              The highest-priority catalysts and market drivers that should matter most for entries, exits, and trade timing.
            </div>
          </div>

          <div className="space-y-4">
            {topDrivers.length ? (
              topDrivers.map((article, idx) => (
                <ArticleCard
                  key={keyForArticle(article, idx)}
                  article={article}
                  idx={idx}
                  symbol={analysis.symbol}
                />
              ))
            ) : (
              <div className="rounded-2xl border border-white/10 bg-[#0b1323] p-4 text-sm text-slate-300">
                No meaningful catalysts are available yet.
              </div>
            )}
          </div>
        </section>
      </div>

      <div className="space-y-6">
        <section className="panel p-5">
          <div className="text-xl font-semibold">Trade Context</div>

          <div className="mt-4 space-y-3">
            <div className="rounded-2xl border border-white/10 bg-[#0b1323] p-4">
              <div className="text-[11px] uppercase tracking-[0.18em] text-slate-500">Regime</div>
              <div className="mt-2 text-sm text-slate-200">
                {analysis.professional_analysis?.regime || "Unknown"}
              </div>
            </div>

            <div className="rounded-2xl border border-white/10 bg-[#0b1323] p-4">
              <div className="text-[11px] uppercase tracking-[0.18em] text-slate-500">Primary driver</div>
              <div className="mt-2 text-sm text-slate-200">
                {(analysis.professional_analysis?.primary_driver || "unknown").replaceAll("_", " ")}
              </div>
            </div>

            <div className="rounded-2xl border border-white/10 bg-[#0b1323] p-4">
              <div className="text-[11px] uppercase tracking-[0.18em] text-slate-500">Confirmation</div>
              <div className="mt-2 text-sm text-slate-200">
                {(analysis.professional_analysis?.confirmation || []).length
                  ? analysis.professional_analysis.confirmation.join(" • ")
                  : "No confirmation factors listed."}
              </div>
            </div>

            <div className="rounded-2xl border border-white/10 bg-[#0b1323] p-4">
              <div className="text-[11px] uppercase tracking-[0.18em] text-slate-500">Invalidation</div>
              <div className="mt-2 text-sm text-slate-200">
                {(analysis.professional_analysis?.invalidation || []).length
                  ? analysis.professional_analysis.invalidation.join(" • ")
                  : "No invalidation factors listed."}
              </div>
            </div>
          </div>
        </section>

        <section className="panel p-5">
          <div className="text-xl font-semibold">Ticker Catalysts</div>
          <div className="mt-4 space-y-3">
            {tickerCatalysts.length ? (
              tickerCatalysts.slice(0, 2).map((article, idx) => (
                <ArticleCard
                  key={keyForArticle(article, idx + 20)}
                  article={article}
                  idx={idx + 20}
                  symbol={analysis.symbol}
                />
              ))
            ) : (
              <div className="rounded-2xl border border-white/10 bg-[#0b1323] p-4 text-sm text-slate-300">
                No ticker-specific catalysts available.
              </div>
            )}
          </div>
        </section>

        <section className="panel p-5">
          <div className="text-xl font-semibold">Macro Drivers</div>
          <div className="mt-4 space-y-3">
            {macroDrivers.length ? (
              macroDrivers.slice(0, 1).map((article, idx) => (
                <ArticleCard
                  key={keyForArticle(article, idx + 50)}
                  article={article}
                  idx={idx + 50}
                  symbol={analysis.symbol}
                />
              ))
            ) : (
              <div className="rounded-2xl border border-white/10 bg-[#0b1323] p-4 text-sm text-slate-300">
                No macro drivers available.
              </div>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}