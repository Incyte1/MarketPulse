import { useEffect, useRef, useState } from "react";
import type {
  CandlestickData,
  IChartApi,
  ISeriesApi,
  UTCTimestamp
} from "lightweight-charts";
import { useChartCandles } from "../../../hooks/useChartCandles";
import type { CandleRecord } from "../../../lib/contracts";
import type { ChartProviderDefinition, ChartProviderProps, ChartTimeframe } from "../types";
import { PlaceholderChart } from "./placeholder";

type LightweightChartsModule = typeof import("lightweight-charts");

const TIMEFRAME_OPTIONS: Array<{ label: string; value: ChartTimeframe }> = [
  { label: "1m", value: "1min" },
  { label: "5m", value: "5min" },
  { label: "15m", value: "15min" }
];

function normalizeTimeframe(timeframe: string): ChartTimeframe {
  switch (timeframe.toLowerCase()) {
    case "1m":
    case "1min":
      return "1min";
    case "15m":
    case "15min":
      return "15min";
    case "5m":
    case "5min":
    default:
      return "5min";
  }
}

function toUtcTimestamp(timestamp: string): UTCTimestamp {
  return Math.floor(new Date(timestamp).getTime() / 1000) as UTCTimestamp;
}

function toCandlestickPoint(candle: CandleRecord): CandlestickData {
  return {
    time: toUtcTimestamp(candle.timestamp),
    open: candle.open,
    high: candle.high,
    low: candle.low,
    close: candle.close
  };
}

function sortCandles(candles: CandleRecord[]) {
  return [...candles].sort(
    (left, right) =>
      new Date(left.timestamp).getTime() - new Date(right.timestamp).getTime()
  );
}

function LightweightChartProvider({ model }: ChartProviderProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const seriesRef = useRef<ISeriesApi<"Candlestick"> | null>(null);
  const [runtimeError, setRuntimeError] = useState<string | null>(null);
  const [chartLibrary, setChartLibrary] = useState<LightweightChartsModule | null>(null);
  const [selectedTimeframe, setSelectedTimeframe] = useState<ChartTimeframe>(
    normalizeTimeframe(model.timeframe)
  );

  useEffect(() => {
    setSelectedTimeframe(normalizeTimeframe(model.timeframe));
  }, [model.symbol, model.timeframe]);

  const candleHistory = useChartCandles(model.symbol, selectedTimeframe, Boolean(model.symbol));
  const candles = candleHistory.data?.items ? sortCandles(candleHistory.data.items) : [];
  const hasCandles = candles.length > 0;
  const activeSource = candleHistory.data?.source ?? model.dataSource ?? "chart-unavailable";
  const activeQuality = candleHistory.data?.quality ?? model.dataQuality ?? "mixed";
  const lastUpdated = candles.length > 0 ? candles[candles.length - 1].timestamp : null;

  useEffect(() => {
    let cancelled = false;

    import("lightweight-charts")
      .then((module) => {
        if (cancelled) {
          return;
        }
        setChartLibrary(module);
        setRuntimeError(null);
      })
      .catch((error: unknown) => {
        if (cancelled) {
          return;
        }
        setRuntimeError(
          error instanceof Error ? error.message : "Failed to load the chart runtime."
        );
      });

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!chartLibrary || !containerRef.current || !hasCandles) {
      return;
    }

    const host = containerRef.current;
    const chart = chartLibrary.createChart(host, {
      width: host.clientWidth || 640,
      height: host.clientHeight || 320,
      layout: {
        background: { color: "rgba(255, 252, 247, 0.14)" },
        textColor: "#31454f",
        attributionLogo: false
      },
      grid: {
        vertLines: { color: "rgba(18, 32, 38, 0.08)" },
        horzLines: { color: "rgba(18, 32, 38, 0.08)" }
      },
      rightPriceScale: {
        borderColor: "rgba(18, 32, 38, 0.12)"
      },
      timeScale: {
        borderColor: "rgba(18, 32, 38, 0.12)",
        timeVisible: true,
        secondsVisible: false,
        rightOffset: 8,
        barSpacing: selectedTimeframe === "1min" ? 9 : selectedTimeframe === "5min" ? 7 : 6
      },
      crosshair: {
        mode: chartLibrary.CrosshairMode.MagnetOHLC,
        vertLine: {
          color: "rgba(13, 108, 90, 0.35)",
          labelBackgroundColor: "#0d6c5a"
        },
        horzLine: {
          color: "rgba(18, 93, 114, 0.28)",
          labelBackgroundColor: "#125d72"
        }
      },
      localization: {
        locale: "en-US"
      }
    });

    const series = chart.addSeries(chartLibrary.CandlestickSeries, {
      upColor: "#0d6c5a",
      borderUpColor: "#0d6c5a",
      wickUpColor: "#0d6c5a",
      downColor: "#a14432",
      borderDownColor: "#a14432",
      wickDownColor: "#a14432",
      priceLineVisible: true,
      lastValueVisible: true
    });

    const resizeObserver = new ResizeObserver((entries) => {
      const entry = entries[0];
      if (!entry) {
        return;
      }
      chart.applyOptions({
        width: entry.contentRect.width,
        height: Math.max(entry.contentRect.height, 320)
      });
    });

    resizeObserver.observe(host);
    chartRef.current = chart;
    seriesRef.current = series;

    return () => {
      resizeObserver.disconnect();
      seriesRef.current = null;
      chartRef.current = null;
      chart.remove();
    };
  }, [chartLibrary, hasCandles]);

  useEffect(() => {
    if (!chartRef.current || !seriesRef.current) {
      return;
    }

    chartRef.current.applyOptions({
      timeScale: {
        timeVisible: true,
        secondsVisible: false,
        rightOffset: 8,
        barSpacing: selectedTimeframe === "1min" ? 9 : selectedTimeframe === "5min" ? 7 : 6
      }
    });

    seriesRef.current.setData(candles.map(toCandlestickPoint));
    if (candles.length > 0) {
      chartRef.current.timeScale().fitContent();
    }
  }, [candles, selectedTimeframe]);

  if (!hasCandles && !candleHistory.isLoading) {
    const fallbackNotes = [
      runtimeError ?? candleHistory.error ?? "Chart data is currently unavailable from the backend candle route.",
      ...(model.notes ?? [])
    ];

    return (
      <PlaceholderChart
        model={{
          ...model,
          dataQuality: activeQuality,
          dataSource: activeSource,
          renderMode: "embedded",
          timeframe: selectedTimeframe,
          notes: fallbackNotes
        }}
      />
    );
  }

  return (
    <div className="chartProviderCard">
      <div className="chartToolbar">
        <div className="filterList">
          {TIMEFRAME_OPTIONS.map((option) => (
            <button
              key={option.value}
              type="button"
              className={option.value === selectedTimeframe ? "filterChip isSelected" : "filterChip"}
              onClick={() => setSelectedTimeframe(option.value)}
            >
              {option.label}
            </button>
          ))}
        </div>
        <div className="chartMetaRail">
          <span className="tag mono">{activeSource}</span>
          <span className={`warningTag is${activeQuality === "provider" ? "low" : activeQuality === "fallback" ? "caution" : "info"}`}>
            {activeQuality}
          </span>
        </div>
      </div>

      {candleHistory.isLoading && !hasCandles ? (
        <div className="stateBlock">
          <strong>Loading chart candles...</strong>
          <p>The chart is requesting {selectedTimeframe} candles from the app&apos;s market route.</p>
        </div>
      ) : (
        <div
          ref={containerRef}
          className="chartCanvasHost"
        />
      )}

      <div className="signalBoardMeta">
        <span>{model.symbol} intraday candles</span>
        <span>{selectedTimeframe.replace("min", "m")} view</span>
        <span>
          {lastUpdated
            ? `Last candle ${new Date(lastUpdated).toLocaleTimeString([], {
                hour: "numeric",
                minute: "2-digit"
              })}`
            : "No candle timestamp"}
        </span>
      </div>

      {candleHistory.error && hasCandles ? (
        <div className="stateBlock">
          <strong>Using last successful candle set.</strong>
          <p>{candleHistory.error}</p>
        </div>
      ) : null}

      {model.notes?.length ? (
        <ul className="plainList chartNoteList">
          {model.notes.map((note) => (
            <li key={note}>{note}</li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}

export const lightweightChartProvider: ChartProviderDefinition = {
  id: "lightweight",
  label: "TradingView Lightweight Charts",
  capabilities: {
    indicators: false,
    drawings: false,
    streaming: false
  },
  Component: LightweightChartProvider
};
