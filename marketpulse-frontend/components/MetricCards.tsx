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
        detail: `Trend ${tech.trend_medium}, momentum ${tech.momentum_state}, and structure ${tech.structure_score} are defining the current bias.`,
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
        label: "Primary Driver",
        headline: readable(pro.primary_driver),
        subline: `${pro.secondary_drivers.length} secondary factors`,
        detail: pro.secondary_drivers.length
          ? `Secondary drivers: ${pro.secondary_drivers.join(" | ")}.`
          : "No secondary drivers are listed for the current read.",
        tone: "text-[var(--accent-neutral)]",
      },
      {
        id: "plan",
        label: horizon === "short_term" ? "Execution Plan" : "Thesis Plan",
        headline: readable(guidance.preferred_direction),
        subline: guidance.headline || "Plan note pending",
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
      <div className="flex flex-col gap-3 border-b border-white/10 px-4 py-4 lg:flex-row lg:items-end lg:justify-between lg:px-5">
        <div>
          <div className="eyebrow">Decision Strip</div>
          <div className="mt-1 text-base font-semibold text-white">
            Bias, conviction, driver, and active plan
          </div>
        </div>
        <div className="desk-chip mono">{analysis.technical_context.volatility_state || "pending"}</div>
      </div>

      <div className="grid gap-px bg-white/5 p-px md:grid-cols-2 xl:grid-cols-4">
        {tape.map((item) => (
          <button
            key={item.id}
            type="button"
            className={`min-h-[152px] rounded-[22px] border border-transparent px-4 py-4 text-left transition ${
              activeItem === item.id
                ? "bg-[rgba(134,248,111,0.08)]"
                : "bg-[rgba(8,14,21,0.92)] hover:bg-[rgba(255,255,255,0.03)]"
            }`}
            onClick={() => setActiveItem(item.id)}
          >
            <div className="eyebrow">{item.label}</div>
            <div className={`mt-4 text-xl font-semibold ${item.tone}`}>{item.headline}</div>
            <div className="mt-3 text-sm leading-7 text-[var(--text-soft)]">{item.subline}</div>
          </button>
        ))}
      </div>

      <div className="border-t border-white/10 px-4 py-4 lg:px-5">
        <div className="grid gap-3 lg:grid-cols-[180px_minmax(0,1fr)] lg:items-start">
          <div className="eyebrow">{activeDetail.label}</div>
          <div className="text-sm leading-7 text-slate-200">{activeDetail.detail}</div>
        </div>
      </div>
    </section>
  );
}
