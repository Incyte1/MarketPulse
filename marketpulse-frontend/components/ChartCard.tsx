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

function readable(value?: string | null) {
  return (value || "Unavailable").replaceAll("_", " ");
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
  const regime = readable(analysis?.professional_analysis.regime);
  const workflowLabel = horizon === "short_term" ? "Execution Stage" : "Thesis Stage";
  const basisInterval = technical?.data_source_interval || interval;
  const workspaceDescription =
    horizon === "short_term"
      ? "Short-term levels are isolated from 1-day hourly structure. The chart workspace stays flexible for faster markup."
      : "Long-term levels are isolated from 1-week daily structure. Use the chart to frame a wider thesis, not intraday noise.";

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
        "paneProperties.background": "#05070a",
        "paneProperties.vertGridProperties.color": "rgba(255,255,255,0.035)",
        "paneProperties.horzGridProperties.color": "rgba(255,255,255,0.035)",
        "symbolWatermarkProperties.transparency": 94,
        "scalesProperties.textColor": "#b4b8bd",
        "mainSeriesProperties.candleStyle.upColor": "#5fe0a2",
        "mainSeriesProperties.candleStyle.borderUpColor": "#5fe0a2",
        "mainSeriesProperties.candleStyle.wickUpColor": "#5fe0a2",
        "mainSeriesProperties.candleStyle.downColor": "#ff7368",
        "mainSeriesProperties.candleStyle.borderDownColor": "#ff7368",
        "mainSeriesProperties.candleStyle.wickDownColor": "#ff7368",
      },
      container_id: chartId,
    });

    container.appendChild(script);

    return () => {
      container.innerHTML = "";
    };
  }, [chartId, tvInterval, tvSymbol]);

  return (
    <section className="frame-shell reveal-up reveal-delay-1 overflow-hidden p-0">
      <div className="border-b border-white/8 px-4 py-4 lg:px-5">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <span className="desk-chip desk-chip-accent mono">{workflowLabel}</span>
              <span className="desk-chip mono">
                Engine {range} / {basisInterval}
              </span>
            </div>

            <div className="mt-4 flex flex-wrap items-end justify-between gap-4">
              <div className="min-w-0">
                <div className="flex items-end gap-3">
                  <div className="mono text-[34px] font-semibold tracking-[-0.08em] text-white sm:text-[42px] lg:text-[52px]">
                    {symbol.toUpperCase()}
                  </div>
                  <div className="pb-2 text-sm uppercase tracking-[0.2em] text-[var(--text-dim)]">
                    {analysis?.market_status || "loading"}
                  </div>
                </div>
                <div className="mt-2 truncate text-sm text-[var(--text-soft)]">
                  {analysis?.company_name || "Loading company profile"}
                </div>
              </div>

              {price != null ? (
                <div className="text-right">
                  <div className="text-[24px] font-semibold tracking-tight text-white sm:text-[30px] lg:text-[38px]">
                    ${price.toFixed(2)}
                  </div>
                  <div className={`mt-1 text-sm font-medium ${change >= 0 ? "signal-positive" : "signal-negative"}`}>
                    {change >= 0 ? "+" : ""}
                    {change.toFixed(2)}%
                  </div>
                </div>
              ) : null}
            </div>

            <div className="mt-4 max-w-4xl text-sm leading-7 text-[var(--text-soft)]">
              {analysis?.guidance.summary ||
                analysis?.professional_analysis.executive_summary ||
                "Loading chart context and current execution read."}
            </div>
          </div>
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-white/8 pt-4">
          <span className="desk-chip mono">{regime}</span>
          <span className="desk-chip mono">
            {technical?.fast_indicator_label || "Fast trend"} active
          </span>
          <span className="desk-chip mono">
            VWAP {technical?.vwap?.toFixed(2) ?? "n/a"}
          </span>
          <span className="desk-chip mono">
            ATR {technical?.atr?.toFixed(2) ?? "n/a"}
          </span>
        </div>
      </div>

      <div className="relative h-[48svh] min-h-[360px] w-full bg-[#05070a] sm:min-h-[420px] lg:h-[52svh] lg:min-h-[520px] 2xl:h-[58svh] 2xl:min-h-[620px]">
        <div
          ref={containerRef}
          className="tradingview-widget-container relative h-full w-full overflow-hidden"
        />

        {loading ? (
          <div className="pointer-events-none absolute right-4 bottom-4 rounded-[14px] border border-white/10 bg-black/55 px-3 py-2 text-xs text-white">
            Refreshing {symbol.toUpperCase()}...
          </div>
        ) : null}
      </div>

      <div className="grid gap-2 border-t border-white/8 p-3 lg:grid-cols-2">
        <div className="sub-surface px-4 py-4">
          <div className="field-label">Level Basis</div>
          <div className="mt-2 text-sm leading-7 text-slate-200">
            {technical?.support_basis || "Support basis unavailable."}
            <br />
            {technical?.resistance_basis || "Resistance basis unavailable."}
          </div>
        </div>

        <div className="sub-surface px-4 py-4">
          <div className="field-label">Engine Status</div>
          <div className="mt-2 text-sm leading-7 text-slate-200">
            {technical?.calibration_window || workspaceDescription}
            <br />
            Range position {technical?.range_position_percent?.toFixed(1) ?? "n/a"}% | Cached candles{" "}
            {candles.length}
          </div>
        </div>
      </div>
    </section>
  );
}
