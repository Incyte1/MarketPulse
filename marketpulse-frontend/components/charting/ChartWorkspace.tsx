"use client";

import { startTransition, useDeferredValue, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { fetchChart, type Candle } from "@/lib/api";
import { getStoredSession } from "@/lib/auth";
import ChartContainer from "@/components/charting/ChartContainer";
import TradingViewChart from "@/components/charting/TradingViewChart";
import { Input } from "@/components/ui/Input";
import {
  createBackendChartPersistenceAdapter,
  createMockChartPersistenceAdapter,
} from "@/lib/charting/persistence";
import { mapIntervalToApi, type ChartMarketDataAdapter } from "@/lib/charting/tradingview";
import type {
  ChartInstrument,
  ChartLayoutDocument,
  ChartLayoutSummary,
  ChartPersistenceAdapter,
  ChartThemeMode,
  ChartTimeframe,
  ChartTool,
  ChartUserSettings,
} from "@/lib/charting/types";
import { symbols } from "@/lib/mock-unveni";

const timeframes: Array<{ value: ChartTimeframe; label: string }> = [
  { value: "15", label: "15m" },
  { value: "60", label: "1h" },
  { value: "1D", label: "1D" },
  { value: "1W", label: "1W" },
];

const toolOptions: Array<{ value: ChartTool; label: string }> = [
  { value: "cursor", label: "Cursor" },
  { value: "trend_line", label: "Trend" },
  { value: "horizontal_ray", label: "Level" },
  { value: "fib_retracement", label: "Fib" },
  { value: "rectangle", label: "Box" },
];

const indicatorOptions = ["VWAP", "EMA 20", "EMA 50", "Volume"];

function formatUpdated(value: string) {
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return "Unknown";
  return parsed.toLocaleString([], {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function normalizeSymbol(value: string) {
  return value.trim().toUpperCase();
}

function buildMockCandles(symbol: string): Candle[] {
  const record = symbols.find((item) => item.symbol === symbol.toUpperCase()) ?? symbols[0];
  const base = record.chartSeries;
  const dates = Array.from({ length: base.length }, (_, index) => {
    const date = new Date();
    date.setDate(date.getDate() - (base.length - index));
    return date.toISOString();
  });

  return base.map((point, index) => ({
    datetime: dates[index],
    open: Number((point * 0.995).toFixed(2)),
    high: Number((point * 1.01).toFixed(2)),
    low: Number((point * 0.985).toFixed(2)),
    close: Number(point.toFixed(2)),
    volume: 1000000 + index * 15000,
  }));
}

export default function ChartWorkspace() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [initialRouteState] = useState(() => ({
    symbol: searchParams.get("symbol")?.toUpperCase() ?? "SPY",
    interval: (searchParams.get("interval") as ChartTimeframe) || "60",
    layoutId: Number(searchParams.get("layout") || 0) || null,
  }));
  const [adapter, setAdapter] = useState<ChartPersistenceAdapter | null>(null);
  const [storageMode, setStorageMode] = useState<"backend" | "mock">("mock");
  const [storageMessage, setStorageMessage] = useState("Initializing chart storage.");
  const [settings, setSettings] = useState<ChartUserSettings | null>(null);
  const [layouts, setLayouts] = useState<ChartLayoutSummary[]>([]);
  const [activeLayout, setActiveLayout] = useState<ChartLayoutDocument | null>(null);
  const [layoutName, setLayoutName] = useState("Primary Layout");
  const [symbolInput, setSymbolInput] = useState(initialRouteState.symbol);
  const [activeSymbol, setActiveSymbol] = useState(initialRouteState.symbol);
  const [activeInterval, setActiveInterval] = useState<ChartTimeframe>(initialRouteState.interval);
  const [theme, setTheme] = useState<ChartThemeMode>("dark");
  const [indicators, setIndicators] = useState<string[]>(["VWAP", "EMA 20", "Volume"]);
  const [activeTool, setActiveTool] = useState<ChartTool>("cursor");
  const [fallbackCandles, setFallbackCandles] = useState<Candle[]>([]);
  const [chartLoading, setChartLoading] = useState(true);
  const [chartError, setChartError] = useState<string | null>(null);
  const [saveState, setSaveState] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [engineMode, setEngineMode] = useState<"advanced" | "fallback">("fallback");
  const [engineMessage, setEngineMessage] = useState("Waiting for chart engine.");

  const deferredSymbolInput = useDeferredValue(symbolInput);

  const instruments = useMemo<ChartInstrument[]>(
    () =>
      symbols.map((item) => ({
        symbol: item.symbol,
        name: item.name,
      })),
    []
  );

  const symbolSuggestions = useMemo(() => {
    const query = deferredSymbolInput.trim().toUpperCase();
    if (!query) {
      return instruments.slice(0, 6);
    }

    return instruments
      .filter((item) => `${item.symbol} ${item.name}`.toUpperCase().includes(query))
      .slice(0, 6);
  }, [deferredSymbolInput, instruments]);

  const watchlistSymbols = useMemo(
    () =>
      settings?.watchlist_symbols?.length
        ? settings.watchlist_symbols
        : ["SPY", "QQQ", "NVDA", "MSFT"],
    [settings]
  );

  const marketDataAdapter = useMemo<ChartMarketDataAdapter>(
    () => ({
      async getHistory(symbol, interval) {
        const mapping = mapIntervalToApi(interval);
        const response = await fetchChart(symbol, mapping.interval, mapping.range);
        return response.candles;
      },
      async searchSymbols(query) {
        const normalized = query.trim().toUpperCase();
        const matches = instruments.filter((item) =>
          `${item.symbol} ${item.name}`.toUpperCase().includes(normalized)
        );
        return matches.slice(0, 10).map((item) => ({
          symbol: item.symbol,
          full_name: item.symbol,
          description: item.name,
          exchange: "NASDAQ",
          ticker: item.symbol,
          type: "stock",
        }));
      },
    }),
    [instruments]
  );

  function syncUrl(nextSymbol: string, nextInterval: string, nextLayoutId: number | null) {
    const params = new URLSearchParams();
    params.set("symbol", nextSymbol);
    params.set("interval", nextInterval);
    if (nextLayoutId != null) {
      params.set("layout", String(nextLayoutId));
    }

    startTransition(() => {
      router.replace(`/workspace/chart?${params.toString()}`, { scroll: false });
    });
  }

  async function persistSettings(
    partial: Partial<Omit<ChartUserSettings, "updated_at">>
  ) {
    if (!adapter) return;

    try {
      const nextSettings = await adapter.saveSettings(partial);
      setSettings(nextSettings);
      setStorageMessage(
        adapter.mode === "backend"
          ? "Chart settings are syncing to your Unveni account."
          : "Chart settings are stored locally in demo mode."
      );
    } catch (error) {
      setStorageMessage(
        error instanceof Error ? error.message : "Unable to save chart settings."
      );
    }
  }

  async function loadLayoutDocument(nextAdapter: ChartPersistenceAdapter, layoutId: number) {
    const layout = await nextAdapter.loadLayout(layoutId);
    setActiveLayout(layout);
    setLayoutName(layout.name);
    setActiveSymbol(layout.symbol);
    setSymbolInput(layout.symbol);
    setActiveInterval(layout.interval as ChartTimeframe);
    setTheme(layout.theme);
    setIndicators(layout.payload.indicators);
    setActiveTool(layout.payload.active_tool);
    syncUrl(layout.symbol, layout.interval, layout.id);
  }

  useEffect(() => {
    let active = true;
    const replaceUrl = (
      nextSymbol: string,
      nextInterval: string,
      nextLayoutId: number | null
    ) => {
      const params = new URLSearchParams();
      params.set("symbol", nextSymbol);
      params.set("interval", nextInterval);
      if (nextLayoutId != null) {
        params.set("layout", String(nextLayoutId));
      }

      startTransition(() => {
        router.replace(`/workspace/chart?${params.toString()}`, { scroll: false });
      });
    };

    async function bootstrap() {
      const session = getStoredSession();
      const preferredAdapter = session?.token
        ? createBackendChartPersistenceAdapter(session.token)
        : createMockChartPersistenceAdapter();

      try {
        const bootstrapResponse = await preferredAdapter.getBootstrap();
        if (!active) return;

        setAdapter(preferredAdapter);
        setStorageMode(preferredAdapter.mode);
        setLayouts(bootstrapResponse.layouts);
        setSettings(bootstrapResponse.settings);
        setTheme(bootstrapResponse.settings.theme);

        const queryLayoutId = initialRouteState.layoutId;
        const querySymbol = normalizeSymbol(
          initialRouteState.symbol || bootstrapResponse.settings.last_symbol || "SPY"
        );
        const queryInterval =
          initialRouteState.interval ||
          (bootstrapResponse.settings.last_interval as ChartTimeframe) ||
          "60";
        const initialLayout =
          bootstrapResponse.layouts.find((item) => item.id === queryLayoutId) ??
          bootstrapResponse.layouts.find((item) => item.is_default) ??
          bootstrapResponse.layouts[0] ??
          null;

        if (initialLayout && queryLayoutId) {
          const layout = await preferredAdapter.loadLayout(initialLayout.id);
          setActiveLayout(layout);
          setLayoutName(layout.name);
          setActiveSymbol(layout.symbol);
          setSymbolInput(layout.symbol);
          setActiveInterval(layout.interval as ChartTimeframe);
          setTheme(layout.theme);
          setIndicators(layout.payload.indicators);
          setActiveTool(layout.payload.active_tool);
          replaceUrl(layout.symbol, layout.interval, layout.id);
        } else if (initialLayout) {
          const layout = await preferredAdapter.loadLayout(initialLayout.id);
          setActiveLayout(layout);
          setLayoutName(layout.name);
          setTheme(layout.theme);
          setIndicators(layout.payload.indicators);
          setActiveTool(layout.payload.active_tool);
          setActiveSymbol(querySymbol);
          setSymbolInput(querySymbol);
          setActiveInterval(queryInterval);
          replaceUrl(querySymbol, queryInterval, initialLayout.id);
        } else {
          setActiveSymbol(querySymbol);
          setSymbolInput(querySymbol);
          setActiveInterval(queryInterval);
          replaceUrl(querySymbol, queryInterval, null);
        }

        setStorageMessage(
          preferredAdapter.mode === "backend"
            ? "Layouts and settings are loading from your Unveni account."
            : "No authenticated session found. Chart data is using local demo persistence."
        );
      } catch (error) {
        const fallbackAdapter = createMockChartPersistenceAdapter();
        const bootstrapResponse = await fallbackAdapter.getBootstrap();
        if (!active) return;

        setAdapter(fallbackAdapter);
        setStorageMode("mock");
        setLayouts(bootstrapResponse.layouts);
        setSettings(bootstrapResponse.settings);
        setTheme(bootstrapResponse.settings.theme);

        const initialLayout =
          bootstrapResponse.layouts.find((item) => item.is_default) ??
          bootstrapResponse.layouts[0] ??
          null;
        if (initialLayout) {
          const layout = await fallbackAdapter.loadLayout(initialLayout.id);
          setActiveLayout(layout);
          setLayoutName(layout.name);
          setTheme(layout.theme);
          setIndicators(layout.payload.indicators);
          setActiveTool(layout.payload.active_tool);
          const querySymbol = normalizeSymbol(
            initialRouteState.symbol || bootstrapResponse.settings.last_symbol || "SPY"
          );
          const queryInterval =
            initialRouteState.interval ||
            (bootstrapResponse.settings.last_interval as ChartTimeframe) ||
            "60";
          setActiveSymbol(querySymbol);
          setSymbolInput(querySymbol);
          setActiveInterval(queryInterval);
          replaceUrl(querySymbol, queryInterval, initialLayout.id);
        }

        setStorageMessage(
          error instanceof Error
            ? `${error.message} Falling back to local chart persistence.`
            : "Falling back to local chart persistence."
        );
      }
    }

    bootstrap();

    return () => {
      active = false;
    };
  }, [initialRouteState, router]);

  useEffect(() => {
    let active = true;

    async function loadCandles() {
      setChartLoading(true);
      setChartError(null);

      try {
        const mapping = mapIntervalToApi(activeInterval);
        const response = await fetchChart(activeSymbol, mapping.interval, mapping.range);
        if (!active) return;
        setFallbackCandles(response.candles);
      } catch (error) {
        if (!active) return;
        setFallbackCandles(buildMockCandles(activeSymbol));
        setChartError(
          error instanceof Error
            ? `${error.message} Showing a local fallback tape.`
            : "Unable to load chart candles. Showing a local fallback tape."
        );
      } finally {
        if (active) {
          setChartLoading(false);
        }
      }
    }

    loadCandles();

    return () => {
      active = false;
    };
  }, [activeInterval, activeSymbol]);

  function applySymbol(symbol: string) {
    const normalized = normalizeSymbol(symbol);
    if (!normalized) return;
    setActiveSymbol(normalized);
    setSymbolInput(normalized);
    syncUrl(normalized, activeInterval, activeLayout?.id ?? null);
    void persistSettings({ last_symbol: normalized });
  }

  function applyInterval(interval: ChartTimeframe) {
    setActiveInterval(interval);
    syncUrl(activeSymbol, interval, activeLayout?.id ?? null);
    void persistSettings({ last_interval: interval });
  }

  function toggleIndicator(indicator: string) {
    const nextIndicators = indicators.includes(indicator)
      ? indicators.filter((item) => item !== indicator)
      : [...indicators, indicator];
    setIndicators(nextIndicators);
    void persistSettings({ favorite_indicators: nextIndicators });
  }

  function toggleTheme() {
    const nextTheme: ChartThemeMode = theme === "dark" ? "light" : "dark";
    setTheme(nextTheme);
    void persistSettings({ theme: nextTheme });
  }

  async function saveCurrentLayout(asNew: boolean) {
    if (!adapter) return;

    setSaveState("saving");
    const request = {
      name: layoutName,
      symbol: activeSymbol,
      interval: activeInterval,
      theme,
      is_default: activeLayout?.is_default ?? false,
      payload: {
        symbol: activeSymbol,
        interval: activeInterval,
        theme,
        indicators,
        drawings: activeLayout?.payload.drawings ?? [],
        active_tool: activeTool,
        notes: activeLayout?.payload.notes ?? "Chart workspace state",
        tv_chart_content: activeLayout?.payload.tv_chart_content ?? {},
      },
    };

    try {
      const document =
        !asNew && activeLayout
          ? await adapter.updateLayout(activeLayout.id, request)
          : await adapter.createLayout(request);

      const bootstrapResponse = await adapter.getBootstrap();
      setLayouts(bootstrapResponse.layouts);
      setActiveLayout(document);
      setLayoutName(document.name);
      setSaveState("saved");
      setStorageMessage(
        adapter.mode === "backend"
          ? "Layout saved to your Unveni account."
          : "Layout saved to local demo storage."
      );
      syncUrl(activeSymbol, activeInterval, document.id);
    } catch (error) {
      setSaveState("error");
      setStorageMessage(
        error instanceof Error ? error.message : "Unable to save chart layout."
      );
    }
  }

  const toolbar = (
    <>
      <div className="chart-toolbar-primary">
        <div className="chart-toolbar-field">
          <span className="chart-toolbar-label">Symbol</span>
          <Input
            value={symbolInput}
            onChange={(event) => setSymbolInput(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                event.preventDefault();
                applySymbol(symbolInput);
              }
            }}
            placeholder="Symbol"
            className="min-w-[120px]"
          />
        </div>

        <div className="chart-toolbar-list">
          {symbolSuggestions.map((item) => (
            <button
              key={item.symbol}
              type="button"
              className={`chart-toolbar-chip ${
                activeSymbol === item.symbol ? "chart-toolbar-chip-active" : ""
              }`}
              onClick={() => applySymbol(item.symbol)}
            >
              <span>{item.symbol}</span>
              <span>{item.name}</span>
            </button>
          ))}
        </div>
      </div>

      <div className="chart-toolbar-secondary">
        <div className="chart-toolbar-segment">
          {timeframes.map((item) => (
            <button
              key={item.value}
              type="button"
              className={`chart-segment-button ${
                activeInterval === item.value ? "chart-segment-button-active" : ""
              }`}
              onClick={() => applyInterval(item.value)}
            >
              {item.label}
            </button>
          ))}
        </div>

        <div className="chart-toolbar-segment">
          <button
            type="button"
            className="chart-segment-button"
            onClick={toggleTheme}
          >
            {theme === "dark" ? "Midnight" : "Paper"}
          </button>
          <button
            type="button"
            className="chart-segment-button"
            onClick={() => void saveCurrentLayout(false)}
          >
            {saveState === "saving" ? "Saving" : "Save"}
          </button>
          <button
            type="button"
            className="chart-segment-button"
            onClick={() => void saveCurrentLayout(true)}
          >
            Save As
          </button>
        </div>
      </div>
    </>
  );

  const leftRail = (
    <div className="chart-tool-column">
      {toolOptions.map((tool) => (
        <button
          key={tool.value}
          type="button"
          className={`chart-tool-button ${
            activeTool === tool.value ? "chart-tool-button-active" : ""
          }`}
          onClick={() => setActiveTool(tool.value)}
        >
          <span>{tool.label}</span>
        </button>
      ))}
    </div>
  );

  const chart = (
    <div className="chart-stage-shell">
      <div className="chart-stage-header">
        <div>
          <div className="eyebrow">Chart Deck</div>
          <div className="chart-stage-title">
            {activeSymbol} <span>{activeInterval}</span>
          </div>
        </div>

        <div className="chart-stage-meta">
          <span>{engineMode === "advanced" ? "Licensed engine" : "Fallback engine"}</span>
          <span>{storageMode === "backend" ? "Account sync" : "Local demo sync"}</span>
        </div>
      </div>

      <div className="chart-stage-canvas">
        <TradingViewChart
          symbol={activeSymbol}
          interval={activeInterval}
          theme={theme}
          indicators={indicators}
          activeLayout={activeLayout}
          persistenceAdapter={adapter ?? createMockChartPersistenceAdapter()}
          marketDataAdapter={marketDataAdapter}
          fallbackCandles={fallbackCandles}
          settings={settings}
          onModeChange={(nextMode, nextMessage) => {
            setEngineMode(nextMode);
            setEngineMessage(nextMessage);
          }}
        />

        {chartLoading ? (
          <div className="chart-overlay-note">Refreshing {activeSymbol} market history...</div>
        ) : null}
      </div>
    </div>
  );

  const rightRail = (
    <div className="chart-inspector">
      <div className="chart-inspector-section">
        <div className="chart-inspector-title">Layouts</div>
        <Input
          value={layoutName}
          onChange={(event) => setLayoutName(event.target.value)}
          placeholder="Layout name"
        />
        <div className="chart-layout-list">
          {layouts.map((layout) => (
            <button
              key={layout.id}
              type="button"
              className={`chart-layout-row ${
                activeLayout?.id === layout.id ? "chart-layout-row-active" : ""
              }`}
              onClick={() => {
                if (!adapter) return;
                void loadLayoutDocument(adapter, layout.id);
              }}
            >
              <div>
                <div className="chart-layout-name">{layout.name}</div>
                <div className="chart-layout-meta">
                  {layout.symbol} | {layout.interval}
                </div>
              </div>
              <div className="chart-layout-time">{formatUpdated(layout.updated_at)}</div>
            </button>
          ))}
        </div>
      </div>

      <div className="chart-inspector-section">
        <div className="chart-inspector-title">Indicators</div>
        <div className="chart-pill-grid">
          {indicatorOptions.map((indicator) => (
            <button
              key={indicator}
              type="button"
              className={`chart-pill-button ${
                indicators.includes(indicator) ? "chart-pill-button-active" : ""
              }`}
              onClick={() => toggleIndicator(indicator)}
            >
              {indicator}
            </button>
          ))}
        </div>
      </div>

      <div className="chart-inspector-section">
        <div className="chart-inspector-title">Workspace Sync</div>
        <div className="chart-inspector-copy">{storageMessage}</div>
        <div className="chart-inspector-copy">{engineMessage}</div>
        {chartError ? <div className="chart-inspector-copy">{chartError}</div> : null}
      </div>
    </div>
  );

  const footer = (
    <div className="chart-status-strip">
      <div className="chart-status-block">
        <span className="chart-status-label">Persistence</span>
        <span>{storageMode === "backend" ? "Per-user backend storage" : "Local mock adapter"}</span>
      </div>
      <div className="chart-status-block">
        <span className="chart-status-label">Active Tool</span>
        <span>{activeTool.replaceAll("_", " ")}</span>
      </div>
      <div className="chart-status-block">
        <span className="chart-status-label">Watchlist</span>
        <span>{watchlistSymbols.join("  /  ")}</span>
      </div>
    </div>
  );

  return (
    <div className="chart-page">
      <div className="chart-page-intro">
        <div>
          <div className="eyebrow">Charting Workspace</div>
          <h1 className="chart-page-title">Advanced charts wired into the Unveni desk.</h1>
        </div>
        <p className="chart-page-copy">
          This scaffold is built for the TradingView Charting Library path, with
          account-bound layouts and settings handled by Unveni rather than a third-party login flow.
        </p>
      </div>

      <ChartContainer
        toolbar={toolbar}
        leftRail={leftRail}
        chart={chart}
        rightRail={rightRail}
        footer={footer}
      />
    </div>
  );
}
