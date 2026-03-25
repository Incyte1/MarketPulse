"use client";

import { useMemo, useState } from "react";
import type { AnalysisResponse } from "@/lib/api";

type Props = {
  analysis: AnalysisResponse;
  horizon?: "short_term" | "long_term";
};

type DetailKey = "bias" | "confidence" | "driver" | null;

function cardTone(value: string) {
  const v = value.toLowerCase();
  if (v.includes("bull")) return "border-emerald-500/20 bg-emerald-500/10 text-emerald-300";
  if (v.includes("bear")) return "border-rose-500/20 bg-rose-500/10 text-rose-300";
  return "border-white/10 bg-white/5 text-slate-300";
}

export default function MetricCards({ analysis, horizon = "short_term" }: Props) {
  const [openDetail, setOpenDetail] = useState<DetailKey>(null);

  const biasReason = useMemo(() => {
    const parts: string[] = [];
    const bias = analysis.bias;
    const tech = analysis.technical_context;
    const pro = analysis.professional_analysis;

    parts.push(
      `MarketPulse is calling the current setup ${bias.label.toLowerCase()} because the combined technical and catalyst read leans that way.`
    );

    if (tech.trend_medium !== "unknown") {
      parts.push(`The medium-term trend is ${tech.trend_medium}.`);
    }
    if (tech.price_vs_20d !== "unknown" && tech.price_vs_50d !== "unknown") {
      parts.push(
        `Price is ${tech.price_vs_20d} the 20-day context and ${tech.price_vs_50d} the 50-day context.`
      );
    }
    if (pro.confirmation?.length) {
      parts.push(`Key confirming factors: ${pro.confirmation.join(" • ")}.`);
    }

    return parts.join(" ");
  }, [analysis]);

  const confidenceReason = useMemo(() => {
    const bias = analysis.bias;
    const pro = analysis.professional_analysis;

    return [
      `Confidence is ${bias.confidence_label.toLowerCase()} because the system is measuring how well technical structure, catalysts, and follow-through agree with each other.`,
      `Current confidence score: ${bias.confidence_value} out of 100.`,
      pro.invalidation?.length
        ? `Confidence is limited by these risks: ${pro.invalidation.join(" • ")}.`
        : "",
    ]
      .filter(Boolean)
      .join(" ");
  }, [analysis]);

  const driverReason = useMemo(() => {
    const pro = analysis.professional_analysis;
    const readableDriver = (pro.primary_driver || "unknown").replaceAll("_", " ");

    return [
      `Primary driver means the strongest force shaping the current setup right now.`,
      `For this ticker, the main driver is ${readableDriver}.`,
      pro.secondary_drivers?.length
        ? `Other supporting drivers: ${pro.secondary_drivers.join(" • ")}.`
        : "",
    ]
      .filter(Boolean)
      .join(" ");
  }, [analysis]);

  const detailText =
    openDetail === "bias"
      ? biasReason
      : openDetail === "confidence"
      ? confidenceReason
      : openDetail === "driver"
      ? driverReason
      : null;

  return (
    <>
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <div className="panel p-5">
          <div className="text-xs uppercase tracking-[0.18em] text-slate-500">Ticker</div>
          <div className="mt-3 text-2xl font-semibold">{analysis.symbol}</div>
          <div className="mt-1 text-sm text-slate-400">{analysis.company_name}</div>
        </div>

        <button
          className="panel p-5 text-left transition hover:border-white/20"
          onClick={() => setOpenDetail(openDetail === "bias" ? null : "bias")}
        >
          <div className="text-xs uppercase tracking-[0.18em] text-slate-500">Bias</div>
          <div className={`mt-3 inline-flex rounded-full border px-3 py-1 text-sm ${cardTone(analysis.bias.label)}`}>
            {analysis.bias.label}
          </div>
          <div className="mt-3 text-sm text-slate-300">
            {(analysis.professional_analysis?.regime || "unknown").replaceAll("_", " ")}
          </div>
          <div className="mt-2 text-xs text-cyan-300">Click to see why</div>
        </button>

        <button
          className="panel p-5 text-left transition hover:border-white/20"
          onClick={() => setOpenDetail(openDetail === "confidence" ? null : "confidence")}
        >
          <div className="text-xs uppercase tracking-[0.18em] text-slate-500">Confidence</div>
          <div className="mt-3 text-2xl font-semibold">{analysis.bias.confidence_label}</div>
          <div className="mt-1 text-sm text-slate-400">
            {analysis.bias.confidence_value} / 100 strength
          </div>
          <div className="mt-2 text-xs text-cyan-300">Click to see why</div>
        </button>

        <button
          className="panel p-5 text-left transition hover:border-white/20"
          onClick={() => setOpenDetail(openDetail === "driver" ? null : "driver")}
        >
          <div className="text-xs uppercase tracking-[0.18em] text-slate-500">Primary Driver</div>
          <div className="mt-3 text-xl font-semibold">
            {(analysis.professional_analysis?.primary_driver || "unknown").replaceAll("_", " ")}
          </div>
          <div className="mt-1 text-sm text-slate-400">
            {horizon === "short_term"
              ? "Short-term catalyst and structure read"
              : "Longer-term trend and thesis read"}
          </div>
          <div className="mt-2 text-xs text-cyan-300">Click to see why</div>
        </button>
      </div>

      {detailText ? (
        <div className="mt-4 rounded-2xl border border-cyan-500/20 bg-cyan-500/10 p-4 text-sm text-cyan-100">
          {detailText}
        </div>
      ) : null}
    </>
  );
}