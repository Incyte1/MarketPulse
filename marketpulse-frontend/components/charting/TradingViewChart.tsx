"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { Candle } from "@/lib/api";
import TradingViewFallbackChart from "@/components/charting/TradingViewFallbackChart";
import {
  buildTradingViewWidgetOptions,
  getTradingViewLibraryPath,
  loadTradingViewLibrary,
  type ChartMarketDataAdapter,
} from "@/lib/charting/tradingview";
import type {
  ChartLayoutDocument,
  ChartPersistenceAdapter,
  ChartThemeMode,
  ChartUserSettings,
} from "@/lib/charting/types";

type Props = {
  symbol: string;
  interval: string;
  theme: ChartThemeMode;
  indicators: string[];
  activeLayout: ChartLayoutDocument | null;
  persistenceAdapter: ChartPersistenceAdapter;
  marketDataAdapter: ChartMarketDataAdapter;
  fallbackCandles: Candle[];
  settings: ChartUserSettings | null;
  onModeChange?: (mode: "advanced" | "fallback", message: string) => void;
};

export default function TradingViewChart({
  symbol,
  interval,
  theme,
  indicators,
  activeLayout,
  persistenceAdapter,
  marketDataAdapter,
  fallbackCandles,
  settings,
  onModeChange,
}: Props) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const widgetRef = useRef<{ remove?: () => void } | null>(null);
  const [mode, setMode] = useState<"loading" | "advanced" | "fallback">("loading");
  const [message, setMessage] = useState("Checking for licensed charting assets.");

  const libraryPath = useMemo(() => getTradingViewLibraryPath(), []);

  useEffect(() => {
    let active = true;
    const container = containerRef.current;

    async function mount() {
      if (!container) return;

      widgetRef.current?.remove?.();
      container.innerHTML = "";

      if (!libraryPath) {
        if (!active) return;
        setMode("fallback");
        setMessage("Licensed Charting Library path is not configured. Running the fallback renderer.");
        onModeChange?.(
          "fallback",
          "Licensed Charting Library path is not configured. Running the fallback renderer."
        );
        return;
      }

      try {
        await loadTradingViewLibrary();
        if (!active || !containerRef.current || !window.TradingView?.widget) {
          return;
        }

        const widget = new window.TradingView.widget(
          buildTradingViewWidgetOptions({
            container: containerRef.current,
            symbol,
            interval,
            theme,
            enabledIndicators: indicators,
            activeLayout,
            persistenceAdapter,
            marketDataAdapter,
          })
        );

        widgetRef.current = widget;
        setMode("advanced");
        setMessage("Advanced Charts mounted through the TradingView Charting Library.");
        onModeChange?.(
          "advanced",
          "Advanced Charts mounted through the TradingView Charting Library."
        );
      } catch (error) {
        const fallbackMessage =
          error instanceof Error
            ? `${error.message} Falling back to the built-in chart renderer.`
            : "TradingView assets could not be loaded. Falling back to the built-in chart renderer.";
        if (!active) return;
        setMode("fallback");
        setMessage(fallbackMessage);
        onModeChange?.("fallback", fallbackMessage);
      }
    }

    mount();

    return () => {
      active = false;
      widgetRef.current?.remove?.();
      widgetRef.current = null;
      if (container) {
        container.innerHTML = "";
      }
    };
  }, [
    activeLayout,
    indicators,
    interval,
    libraryPath,
    marketDataAdapter,
    onModeChange,
    persistenceAdapter,
    settings,
    symbol,
    theme,
  ]);

  return (
    <div className="chart-engine-shell">
      <div className="chart-engine-stage">
        <div
          ref={containerRef}
          className={mode === "advanced" ? "h-full w-full" : "hidden"}
        />
        {mode !== "advanced" ? (
          <TradingViewFallbackChart
            candles={fallbackCandles}
            theme={theme}
            indicators={indicators}
          />
        ) : null}
      </div>

      <div className="chart-engine-status">
        <span className="chart-engine-label">
          {mode === "advanced" ? "Advanced Charts" : mode === "fallback" ? "Fallback Engine" : "Loading"}
        </span>
        <span>{message}</span>
      </div>
    </div>
  );
}
