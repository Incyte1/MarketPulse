"use client";

import { useMemo, useState } from "react";
import type { AnalysisResponse } from "@/lib/api";

type Props = {
  analysis: AnalysisResponse;
  horizon?: "short_term" | "long_term";
};

type DetailKey = "bias" | "confidence" | "driver" | "plan";

type TapeItem = {
  id: DetailKey;
  label: string;
  headline: string;
  subline: string;
  detail: string;
  tone: string;
};

function readable(value?: string | null) {
  return (value || "unknown").replaceAll("_", " ");
}

function toneClass(value: string) {
  const normalized = value.toLowerCase();

  if (normalized.includes("bull")) return "signal-positive";
  if (normalized.includes("bear")) return "signal-negative";
  if (normalized.includes("high")) return "text-amber-300";
  return "signal-neutral";
}

export default function MetricCards({ analysis, horizon = "short_term" }: Props) {
  const [activeItem, setActiveItem] = useState<DetailKey>("bias");

  const tape = useMemo<TapeItem[]>(() => {
    const tech = analysis.technical_context;
    const pro = analysis.professional_analysis;
    const guidance = analysis.guidance;

    return [
      {
        id: "bias",
        label: "Bias",
        headline: analysis.bias.label,
        subline: `${analysis.bias.internal_score}/${analysis.bias.total_score} composite`,
        detail: `Trend ${tech.trend_medium}, momentum ${tech.momentum_state}, and structure ${tech.structure_score} are driving the active bias.`,
        tone: toneClass(analysis.bias.label),
      },
      {
        id: "confidence",
        label: "Conviction",
        headline: analysis.bias.confidence_label,
        subline: `${analysis.bias.confidence_value}/100 confidence`,
        detail: pro.confirmation.length
          ? `Confirmation stack: ${pro.confirmation.join(" | ")}.`
          : "No confirmation stack is available yet.",
        tone: toneClass(analysis.bias.confidence_label),
      },
      {
        id: "driver",
        label: "Driver",
        headline: readable(pro.primary_driver),
        subline: `${pro.secondary_drivers.length} secondary factors`,
        detail: pro.secondary_drivers.length
          ? `Secondary drivers: ${pro.secondary_drivers.join(" | ")}.`
          : "No secondary drivers are listed for the current read.",
        tone: "text-[#f0d7d1]",
      },
      {
        id: "plan",
        label: "Plan",
        headline: readable(guidance.preferred_direction),
        subline: horizon === "short_term" ? "Execution mode" : "Thesis mode",
        detail: guidance.warnings.length
          ? `Warnings: ${guidance.warnings.join(" | ")}.`
          : guidance.summary || "No active warning set.",
        tone: "signal-neutral",
      },
    ];
  }, [analysis, horizon]);

  const activeDetail = tape.find((item) => item.id === activeItem) ?? tape[0];

  return (
    <section className="frame-shell reveal-up reveal-delay-1 overflow-hidden p-0">
      <div className="border-b border-white/8 px-4 py-3 lg:px-5">
        <div>
          <div className="eyebrow">Decision</div>
          <div className="mt-1 text-sm text-[var(--text-soft)]">
            Bias, conviction, driver, and plan for the active horizon.
          </div>
        </div>
      </div>

      <div className="grid gap-2 p-3 sm:grid-cols-2 xl:grid-cols-4">
        {tape.map((item) => (
          <button
            key={item.id}
            type="button"
            className={`sub-surface px-4 py-4 text-left transition hover:border-white/16 ${
              activeItem === item.id ? "border-[var(--accent)]/30 bg-[var(--accent)]/10" : ""
            }`}
            onClick={() => setActiveItem(item.id)}
          >
            <div className="flex items-center justify-between gap-3">
              <div className="field-label">{item.label}</div>
              {activeItem === item.id ? <div className="desk-chip mono">Focus</div> : null}
            </div>
            <div className={`mt-3 text-lg font-semibold ${item.tone}`}>{item.headline}</div>
            <div className="mt-2 text-sm text-[var(--text-soft)]">{item.subline}</div>
          </button>
        ))}
      </div>

      <div className="border-t border-white/8 px-4 py-3 lg:px-5">
        <div className="flex flex-col gap-2 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <div className="field-label">{activeDetail.label}</div>
            <div className="mt-2 text-sm leading-7 text-slate-200">{activeDetail.detail}</div>
          </div>
          <div className="desk-chip mono self-start lg:self-auto">
            {analysis.technical_context.volatility_state || "volatility pending"}
          </div>
        </div>
      </div>
    </section>
  );
}
