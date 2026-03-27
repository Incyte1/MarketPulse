"use client";

import { useEffect, useMemo, useRef } from "react";
import type { AnalysisResponse } from "@/lib/api";

type Candle = {
  datetime: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
};

type Props = {
  symbol: string;
  interval: string;
  range: string;
  candles: Candle[];
  analysis?: AnalysisResponse | null;
  horizon?: "short_term" | "long_term";
  loading?: boolean;
};

type ViewInterval = "30m" | "1day";

const EXCHANGE_PREFIX: Record<string, string> = {
  SPY: "AMEX",
  DIA: "AMEX",
  IWM: "AMEX",
  QQQ: "NASDAQ",
  AAPL: "NASDAQ",
  MSFT: "NASDAQ",
  NVDA: "NASDAQ",
  AMD: "NASDAQ",
  TSLA: "NASDAQ",
  META: "NASDAQ",
  AMZN: "NASDAQ",
  GOOGL: "NASDAQ",
  NFLX: "NASDAQ",
  AVGO: "NASDAQ",
  SMCI: "NASDAQ",
  MU: "NASDAQ",
  INTC: "NASDAQ",
  ADBE: "NASDAQ",
  CRM: "NYSE",
  PLTR: "NYSE",
  JPM: "NYSE",
  BAC: "NYSE",
  GS: "NYSE",
  WFC: "NYSE",
  XOM: "NYSE",
  CVX: "NYSE",
  COP: "NYSE",
  SLB: "NYSE",
  UNH: "NYSE",
  JNJ: "NYSE",
  PFE: "NYSE",
  LLY: "NYSE",
  MRK: "NYSE",
  KO: "NYSE",
  PEP: "NYSE",
  MCD: "NYSE",
  NKE: "NYSE",
  WMT: "NYSE",
  COST: "NASDAQ",
  HD: "NYSE",
};

function defaultWorkspaceInterval(horizon: "short_term" | "long_term"): ViewInterval {
  return horizon === "short_term" ? "30m" : "1day";
}

function mapIntervalToTradingView(interval: string): string {
  switch (interval) {
    case "1min":
      return "1";
    case "5min":
      return "5";
    case "15min":
      return "15";
    case "30m":
      return "30";
    case "1h":
      return "60";
    case "4h":
      return "240";
    case "1day":
      return "1D";
    case "1week":
      return "1W";
    default:
      return "1D";
  }
}

function normalizeSymbol(symbol: string): string {
  const upper = symbol.toUpperCase().trim();

  if (upper.includes(":")) return upper;

  const prefix = EXCHANGE_PREFIX[upper];
  return prefix ? `${prefix}:${upper}` : upper;
}

function pretty(value?: string | null) {
  if (!value) return "Pending";
  return value.replaceAll("_", " ").replace(/\b\w/g, (match) => match.toUpperCase());
}

export default function ChartCard({
  symbol,
  interval,
  range,
  candles,
  analysis,
  horizon = "short_term",
  loading = false,
}: Props) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const viewInterval = useMemo<ViewInterval>(() => defaultWorkspaceInterval(horizon), [horizon]);

  const tvSymbol = useMemo(() => normalizeSymbol(symbol), [symbol]);
  const tvInterval = useMemo(() => mapIntervalToTradingView(viewInterval), [viewInterval]);
  const chartId = useMemo(
    () => `unveni-chart-${symbol.toLowerCase()}-${viewInterval.replaceAll(/[^a-z0-9]/gi, "")}`,
    [symbol, viewInterval]
  );
  const price = analysis?.price_context.current_price ?? null;
  const change = analysis?.price_context.daily_change_percent ?? 0;
  const technical = analysis?.technical_context;
  const regime = pretty(analysis?.professional_analysis.regime);
  const workflowLabel = horizon === "short_term" ? "Execution Deck" : "Thesis Deck";
  const basisInterval = technical?.data_source_interval || interval;

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    container.innerHTML = `<div id="${chartId}" class="tradingview-widget-container__widget" style="position:absolute;inset:0"></div>`;

    const script = document.createElement("script");
    script.src = "https://s3.tradingview.com/external-embedding/embed-widget-advanced-chart.js";
    script.type = "text/javascript";
    script.async = true;

    script.innerHTML = JSON.stringify({
      autosize: true,
      symbol: tvSymbol,
      interval: tvInterval,
      timezone: "America/Chicago",
      theme: "dark",
      style: "1",
      locale: "en",
      enable_publishing: false,
      load_last_chart: false,
      allow_symbol_change: true,
      withdateranges: true,
      hide_side_toolbar: false,
      details: false,
      hotlist: false,
      calendar: false,
      news: false,
      save_image: true,
      disabled_features: [
        "use_localstorage_for_settings",
        "save_chart_properties_to_local_storage",
      ],
      support_host: "https://www.tradingview.com",
      studies: ["VWAP@tv-basicstudies", "MASimple@tv-basicstudies"],
      overrides: {
        "paneProperties.background": "#07131d",
        "paneProperties.vertGridProperties.color": "rgba(255,255,255,0.03)",
        "paneProperties.horzGridProperties.color": "rgba(255,255,255,0.03)",
        "symbolWatermarkProperties.transparency": 94,
        "scalesProperties.textColor": "#9eb0be",
        "mainSeriesProperties.candleStyle.upColor": "#86f86f",
        "mainSeriesProperties.candleStyle.borderUpColor": "#86f86f",
        "mainSeriesProperties.candleStyle.wickUpColor": "#86f86f",
        "mainSeriesProperties.candleStyle.downColor": "#ff8c7d",
        "mainSeriesProperties.candleStyle.borderDownColor": "#ff8c7d",
        "mainSeriesProperties.candleStyle.wickDownColor": "#ff8c7d",
      },
      container_id: chartId,
    });

    container.appendChild(script);

    return () => {
      container.innerHTML = "";
    };
  }, [chartId, tvInterval, tvSymbol]);

  return (
    <section className="terminal-panel reveal-up reveal-delay-1 overflow-hidden">
      <div className="terminal-header">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="desk-chip desk-chip-accent mono">{workflowLabel}</span>
            <span className="desk-chip mono">
              {range} / {basisInterval}
            </span>
            <span className="desk-chip mono">{regime}</span>
          </div>

          <div className="mt-3 flex flex-wrap items-end gap-3">
            <div className="text-[2rem] font-semibold tracking-[-0.08em] text-white sm:text-[2.5rem]">
              {symbol.toUpperCase()}
            </div>
            <div className="pb-2 text-xs uppercase tracking-[0.22em] text-[var(--text-dim)]">
              {analysis?.company_name || "Loading company profile"}
            </div>
          </div>

          <div className="mt-2 text-sm leading-7 text-[var(--text-soft)]">
            {analysis?.guidance.headline ||
              analysis?.professional_analysis.plain_english_summary ||
              "Loading chart context and current execution read."}
          </div>
        </div>

        <div className="min-w-[180px] text-left xl:text-right">
          {price != null ? (
            <>
              <div className="text-[1.9rem] font-semibold tracking-[-0.05em] text-white sm:text-[2.3rem]">
                ${price.toFixed(2)}
              </div>
              <div className={`mt-2 text-sm font-semibold ${change >= 0 ? "signal-positive" : "signal-negative"}`}>
                {change >= 0 ? "+" : ""}
                {change.toFixed(2)}%
              </div>
            </>
          ) : null}

          <div className="mt-3 text-xs uppercase tracking-[0.2em] text-[var(--text-dim)]">
            {analysis?.market_status || "Loading"}
          </div>
        </div>
      </div>

      <div className="terminal-pair-grid md:grid-cols-3">
        <div className="terminal-pair">
          <div>
            <div className="terminal-kpi-label">Support / Resistance</div>
            <div className="mt-2 text-sm font-semibold text-white">
              {technical?.support_level?.toFixed(2) ?? "n/a"} /{" "}
              {technical?.resistance_level?.toFixed(2) ?? "n/a"}
            </div>
          </div>
        </div>

        <div className="terminal-pair">
          <div>
            <div className="terminal-kpi-label">VWAP / ATR</div>
            <div className="mt-2 text-sm font-semibold text-white">
              {technical?.vwap?.toFixed(2) ?? "n/a"} / {technical?.atr?.toFixed(2) ?? "n/a"}
            </div>
          </div>
        </div>

        <div className="terminal-pair">
          <div>
            <div className="terminal-kpi-label">Range Position</div>
            <div className="mt-2 text-sm font-semibold text-white">
              {technical?.range_position_percent?.toFixed(1) ?? "n/a"}% | {pretty(technical?.volatility_state)}
            </div>
          </div>
        </div>
      </div>

      <div className="relative h-[54svh] min-h-[420px] w-full bg-[#06111b] lg:min-h-[560px]">
        <div
          ref={containerRef}
          className="tradingview-widget-container relative h-full w-full overflow-hidden"
        />

        {loading ? (
          <div className="pointer-events-none absolute right-4 bottom-4 rounded-[16px] border border-white/10 bg-black/55 px-3 py-2 text-xs text-white">
            Refreshing {symbol.toUpperCase()}...
          </div>
        ) : null}
      </div>

      <div className="terminal-pair-grid md:grid-cols-3">
        <div className="terminal-pair">
          <div>
            <div className="terminal-kpi-label">Level Basis</div>
            <div className="mt-2 text-sm leading-7 text-slate-200">
              {technical?.support_basis || "Support basis unavailable."}
            </div>
          </div>
        </div>

        <div className="terminal-pair">
          <div>
            <div className="terminal-kpi-label">Resistance Basis</div>
            <div className="mt-2 text-sm leading-7 text-slate-200">
              {technical?.resistance_basis || "Resistance basis unavailable."}
            </div>
          </div>
        </div>

        <div className="terminal-pair">
          <div>
            <div className="terminal-kpi-label">Engine Status</div>
            <div className="mt-2 text-sm leading-7 text-slate-200">
              {technical?.calibration_window || "Calibration pending."}
              <br />
              Cached candles {candles.length} | {pretty(technical?.economic_pressure)}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
