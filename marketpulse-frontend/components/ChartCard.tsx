"use client";

import { useEffect, useMemo, useRef } from "react";

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
  loading?: boolean;
};

function mapIntervalToTradingView(interval: string): string {
  switch (interval) {
    case "1min":
      return "1";
    case "5min":
      return "5";
    case "15min":
      return "15";
    case "1h":
      return "60";
    case "1day":
      return "1D";
    case "1week":
      return "1W";
    case "1month":
      return "1M";
    default:
      return "1D";
  }
}

function normalizeSymbol(symbol: string): string {
  const upper = symbol.toUpperCase().trim();

  if (upper === "SPY" || upper === "QQQ") return `AMEX:${upper}`;
  return `NASDAQ:${upper}`;
}

export default function ChartCard({
  symbol,
  interval,
  range,
  candles,
  loading = false,
}: Props) {
  const containerRef = useRef<HTMLDivElement | null>(null);

  const tvSymbol = useMemo(() => normalizeSymbol(symbol), [symbol]);
  const tvInterval = useMemo(() => mapIntervalToTradingView(interval), [interval]);

  useEffect(() => {
    if (!containerRef.current) return;

    containerRef.current.innerHTML = "";

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
      allow_symbol_change: false,
      withdateranges: true,
      hide_side_toolbar: false,
      details: true,
      hotlist: true,
      calendar: true,
      news: true,
      save_image: true,
      watchlist: [],
      support_host: "https://www.tradingview.com",
      studies: [
        "Volume@tv-basicstudies",
        "VWAP@tv-basicstudies",
        "MASimple@tv-basicstudies",
        "RSI@tv-basicstudies",
        "MACD@tv-basicstudies",
        "BB@tv-basicstudies"
      ],
      overrides: {
        "paneProperties.background": "#070b14",
        "paneProperties.vertGridProperties.color": "rgba(148,163,184,0.08)",
        "paneProperties.horzGridProperties.color": "rgba(148,163,184,0.08)",
        "symbolWatermarkProperties.transparency": 90,
        "scalesProperties.textColor": "#cbd5e1"
      },
      container_id: "marketpulse-tradingview-chart"
    });

    containerRef.current.appendChild(script);

    return () => {
      if (containerRef.current) {
        containerRef.current.innerHTML = "";
      }
    };
  }, [tvSymbol, tvInterval, range]);

  return (
    <section className="panel overflow-hidden p-0">
      <div className="flex items-center justify-between border-b border-white/10 px-5 py-4">
        <div>
          <h2 className="text-lg font-semibold">Live Price Action</h2>
          <p className="mt-1 text-sm text-slate-400">
            TradingView chart with dark mode, indicators, drawing tools, and full trader workflow controls.
          </p>
        </div>

        <div className="text-right text-xs text-slate-400">
          <div>{symbol.toUpperCase()}</div>
          <div>
            {interval} · {range}
          </div>
        </div>
      </div>

      <div className="relative h-[760px] w-full bg-[#070b14]">
        <div
          className="tradingview-widget-container h-full w-full"
          ref={containerRef}
        >
          <div id="marketpulse-tradingview-chart" className="h-full w-full" />
        </div>

        {loading ? (
          <div className="pointer-events-none absolute left-4 top-4 rounded-xl border border-cyan-500/20 bg-cyan-500/10 px-3 py-2 text-xs text-cyan-100">
            Refreshing MarketPulse analysis…
          </div>
        ) : null}
      </div>
    </section>
  );
}