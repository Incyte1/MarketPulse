"use client";

import { useEffect, useRef } from "react";
import {
  ColorType,
  CrosshairMode,
  LineStyle,
  createChart,
  type CandlestickData,
  type HistogramData,
  type LineData,
  type UTCTimestamp,
} from "lightweight-charts";
import type { Candle } from "@/lib/api";
import type { ChartThemeMode } from "@/lib/charting/types";

type Props = {
  candles: Candle[];
  theme: ChartThemeMode;
  indicators: string[];
};

function toUtcTimestamp(value: string): UTCTimestamp {
  return Math.floor(new Date(value).getTime() / 1000) as UTCTimestamp;
}

function movingAverage(candles: Candle[], window: number): LineData<UTCTimestamp>[] {
  const values: LineData<UTCTimestamp>[] = [];

  candles.forEach((candle, index) => {
    if (index + 1 < window) return;
    const slice = candles.slice(index - window + 1, index + 1);
    const average =
      slice.reduce((total, item) => total + item.close, 0) / slice.length;
    values.push({
      time: toUtcTimestamp(candle.datetime),
      value: Number(average.toFixed(2)),
    });
  });

  return values;
}

function vwap(candles: Candle[]): LineData<UTCTimestamp>[] {
  const values: LineData<UTCTimestamp>[] = [];
  let cumulativePriceVolume = 0;
  let cumulativeVolume = 0;

  candles.forEach((candle) => {
    const typicalPrice = (candle.high + candle.low + candle.close) / 3;
    const weight = candle.volume || 1;
    cumulativePriceVolume += typicalPrice * weight;
    cumulativeVolume += weight;
    values.push({
      time: toUtcTimestamp(candle.datetime),
      value: Number((cumulativePriceVolume / cumulativeVolume).toFixed(2)),
    });
  });

  return values;
}

export default function TradingViewFallbackChart({
  candles,
  theme,
  indicators,
}: Props) {
  const containerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container || candles.length === 0) return;

    const isLight = theme === "light";
    const chart = createChart(container, {
      autoSize: true,
      layout: {
        background: {
          type: ColorType.Solid,
          color: isLight ? "#f7f2ea" : "#081017",
        },
        textColor: isLight ? "#3d3427" : "#aeb7c2",
        fontFamily: "var(--font-mono)",
      },
      grid: {
        vertLines: {
          color: isLight ? "rgba(61,52,39,0.08)" : "rgba(255,255,255,0.04)",
          style: LineStyle.Solid,
        },
        horzLines: {
          color: isLight ? "rgba(61,52,39,0.08)" : "rgba(255,255,255,0.04)",
          style: LineStyle.Solid,
        },
      },
      crosshair: {
        mode: CrosshairMode.Normal,
      },
      rightPriceScale: {
        borderColor: isLight ? "rgba(61,52,39,0.16)" : "rgba(255,255,255,0.08)",
      },
      timeScale: {
        borderColor: isLight ? "rgba(61,52,39,0.16)" : "rgba(255,255,255,0.08)",
      },
    });

    const candleSeries = chart.addCandlestickSeries({
      upColor: "#86c38b",
      borderUpColor: "#86c38b",
      wickUpColor: "#86c38b",
      downColor: "#dd8469",
      borderDownColor: "#dd8469",
      wickDownColor: "#dd8469",
    });

    const volumeSeries = chart.addHistogramSeries({
      color: isLight ? "rgba(97,84,62,0.24)" : "rgba(223,187,130,0.18)",
      priceFormat: {
        type: "volume",
      },
      priceScaleId: "",
    });
    chart.priceScale("").applyOptions({
      scaleMargins: {
        top: 0.78,
        bottom: 0,
      },
    });

    const candleData: CandlestickData<UTCTimestamp>[] = candles.map((candle) => ({
      time: toUtcTimestamp(candle.datetime),
      open: candle.open,
      high: candle.high,
      low: candle.low,
      close: candle.close,
    }));
    const volumeData: HistogramData<UTCTimestamp>[] = candles.map((candle) => ({
      time: toUtcTimestamp(candle.datetime),
      value: candle.volume,
      color:
        candle.close >= candle.open
          ? "rgba(134,195,139,0.35)"
          : "rgba(221,132,105,0.35)",
    }));

    candleSeries.setData(candleData);
    volumeSeries.setData(volumeData);

    if (indicators.includes("EMA 20")) {
      const series = chart.addLineSeries({
        color: "#dfbb82",
        lineWidth: 2,
        priceLineVisible: false,
      });
      series.setData(movingAverage(candles, 20));
    }

    if (indicators.includes("EMA 50")) {
      const series = chart.addLineSeries({
        color: isLight ? "#8f7b5e" : "#7b97b9",
        lineWidth: 2,
        priceLineVisible: false,
      });
      series.setData(movingAverage(candles, 50));
    }

    if (indicators.includes("VWAP")) {
      const series = chart.addLineSeries({
        color: isLight ? "#5e7f96" : "#8bb7d8",
        lineWidth: 2,
        lineStyle: LineStyle.Dashed,
        priceLineVisible: false,
      });
      series.setData(vwap(candles));
    }

    chart.timeScale().fitContent();

    const observer = new ResizeObserver(() => {
      chart.applyOptions({ width: container.clientWidth, height: container.clientHeight });
      chart.timeScale().fitContent();
    });
    observer.observe(container);

    return () => {
      observer.disconnect();
      chart.remove();
    };
  }, [candles, theme, indicators]);

  return <div ref={containerRef} className="h-full w-full" />;
}
