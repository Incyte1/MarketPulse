import type {
  ChartLayoutDocument,
  ChartPersistenceAdapter,
  ChartThemeMode,
  ChartUserSettings,
} from "@/lib/charting/types";
import type { Candle } from "@/lib/api";

export type ChartMarketDataAdapter = {
  getHistory(symbol: string, interval: string): Promise<Candle[]>;
  searchSymbols(query: string): Promise<
    Array<{
      symbol: string;
      full_name: string;
      description: string;
      exchange: string;
      ticker: string;
      type: string;
    }>
  >;
};

type TradingViewWidgetConfig = {
  container: HTMLElement;
  symbol: string;
  interval: string;
  theme: ChartThemeMode;
  enabledIndicators: string[];
  activeLayout: ChartLayoutDocument | null;
  persistenceAdapter: ChartPersistenceAdapter;
  marketDataAdapter: ChartMarketDataAdapter;
};

declare global {
  interface Window {
    TradingView?: {
      widget?: new (options: Record<string, unknown>) => {
        remove?: () => void;
        onChartReady?: (callback: () => void) => void;
      };
    };
  }
}

const LIBRARY_PATH = process.env.NEXT_PUBLIC_TRADINGVIEW_LIBRARY_PATH ?? "";

function sanitizeLibraryPath(path: string) {
  return path.trim().replace(/\/+$/, "");
}

export function getTradingViewLibraryPath(): string {
  return sanitizeLibraryPath(LIBRARY_PATH);
}

export function mapIntervalToApi(interval: string): {
  interval: "15min" | "1h" | "1day" | "1week";
  range: "5D" | "1M" | "6M" | "1Y";
} {
  switch (interval) {
    case "15":
      return { interval: "15min", range: "5D" };
    case "60":
      return { interval: "1h", range: "1M" };
    case "1W":
      return { interval: "1week", range: "1Y" };
    default:
      return { interval: "1day", range: "6M" };
  }
}

export function toTradingViewSymbol(symbol: string): string {
  const normalized = symbol.toUpperCase().trim();
  if (normalized.includes(":")) return normalized;

  const exchanges: Record<string, string> = {
    SPY: "AMEX",
    QQQ: "NASDAQ",
    IWM: "AMEX",
    DIA: "AMEX",
    NVDA: "NASDAQ",
    MSFT: "NASDAQ",
    AAPL: "NASDAQ",
    AMD: "NASDAQ",
    META: "NASDAQ",
    AMZN: "NASDAQ",
    TSLA: "NASDAQ",
    GOOGL: "NASDAQ",
    XOM: "NYSE",
  };

  return exchanges[normalized] ? `${exchanges[normalized]}:${normalized}` : normalized;
}

export function createTradingViewDatafeed(
  adapter: ChartMarketDataAdapter
): Record<string, unknown> {
  return {
    onReady: (callback: (config: Record<string, unknown>) => void) => {
      setTimeout(() => {
        callback({
          supported_resolutions: ["15", "60", "1D", "1W"],
          supports_marks: false,
          supports_time: true,
          supports_search: true,
          supports_group_request: false,
        });
      }, 0);
    },
    searchSymbols: async (
      userInput: string,
      _exchange: string,
      _symbolType: string,
      onResult: (symbols: unknown[]) => void
    ) => {
      onResult(await adapter.searchSymbols(userInput));
    },
    resolveSymbol: async (
      symbolName: string,
      onResolve: (symbolInfo: Record<string, unknown>) => void,
      onError: (reason: string) => void
    ) => {
      try {
        const symbol = symbolName.split(":").pop() || symbolName;
        onResolve({
          ticker: symbol,
          name: symbol,
          description: symbol,
          type: "stock",
          session: "0930-1600",
          timezone: "America/New_York",
          exchange: symbolName.split(":")[0] || "NASDAQ",
          minmov: 1,
          pricescale: 100,
          has_intraday: true,
          has_daily: true,
          has_weekly_and_monthly: true,
          supported_resolutions: ["15", "60", "1D", "1W"],
          volume_precision: 0,
          data_status: "streaming",
        });
      } catch {
        onError("Unable to resolve symbol.");
      }
    },
    getBars: async (
      symbolInfo: { ticker?: string; name?: string },
      resolution: string,
      _periodParams: Record<string, unknown>,
      onHistory: (bars: Array<Record<string, unknown>>, meta: { noData: boolean }) => void,
      onError: (reason: string) => void
    ) => {
      try {
        const symbol = symbolInfo.ticker || symbolInfo.name || "SPY";
        const candles = await adapter.getHistory(symbol, resolution);
        const bars = candles.map((candle) => ({
          time: new Date(candle.datetime).getTime(),
          open: candle.open,
          high: candle.high,
          low: candle.low,
          close: candle.close,
          volume: candle.volume,
        }));
        onHistory(bars, { noData: bars.length === 0 });
      } catch (error) {
        onError(error instanceof Error ? error.message : "Failed to load bars.");
      }
    },
    subscribeBars: () => {
      // Real-time subscriptions will attach here once a live market stream adapter is added.
    },
    unsubscribeBars: () => {
      // Placeholder for future realtime unsubscribe support.
    },
  };
}

export function createTradingViewSaveLoadAdapter(
  persistenceAdapter: ChartPersistenceAdapter
): Record<string, unknown> {
  return {
    getAllCharts: async () => {
      const bootstrap = await persistenceAdapter.getBootstrap();
      return bootstrap.layouts.map((layout) => ({
        id: String(layout.id),
        name: layout.name,
        symbol: layout.symbol,
        resolution: layout.interval,
        timestamp: layout.updated_at,
      }));
    },
    getChartContent: async (chartId: string) => {
      const layout = await persistenceAdapter.loadLayout(Number(chartId));
      return layout.payload.tv_chart_content ?? {};
    },
    saveChart: async (chartData: Record<string, unknown>) => {
      const payload = chartData as {
        id?: string;
        name?: string;
        content?: Record<string, unknown>;
        symbol?: string;
        resolution?: string;
      };

      const request = {
        name: payload.name || "Saved Layout",
        symbol: payload.symbol || "SPY",
        interval: payload.resolution || "60",
        theme: "dark" as const,
        payload: {
          symbol: payload.symbol || "SPY",
          interval: payload.resolution || "60",
          theme: "dark" as const,
          indicators: [],
          drawings: [],
          active_tool: "cursor" as const,
          notes: "",
          tv_chart_content: payload.content || {},
        },
      };

      if (payload.id) {
        await persistenceAdapter.updateLayout(Number(payload.id), request);
        return payload.id;
      }

      const created = await persistenceAdapter.createLayout(request);
      return String(created.id);
    },
    removeChart: async (chartId: string) => {
      void chartId;
      // Delete support can be added later without changing the frontend contract.
    },
  };
}

export function createTradingViewSettingsAdapter(
  persistenceAdapter: ChartPersistenceAdapter,
  settings: ChartUserSettings
): Record<string, unknown> {
  const values = {
    theme: settings.theme,
    left_toolbar_open: settings.left_toolbar_open,
    right_sidebar_open: settings.right_sidebar_open,
    favorite_intervals: settings.favorite_intervals,
  };

  return {
    initialSettings: values,
    setValue: async (key: string, value: unknown) => {
      if (key === "theme" && (value === "dark" || value === "light")) {
        await persistenceAdapter.saveSettings({ theme: value });
      }
    },
    removeValue: async () => {
      // Placeholder for later parity with the full settings adapter contract.
    },
  };
}

export function buildTradingViewWidgetOptions(
  config: TradingViewWidgetConfig
): Record<string, unknown> {
  return {
    container: config.container,
    library_path: `${getTradingViewLibraryPath()}/`,
    symbol: toTradingViewSymbol(config.symbol),
    interval: config.interval,
    autosize: true,
    fullscreen: false,
    locale: "en",
    timezone: "America/Chicago",
    theme: config.theme === "light" ? "Light" : "Dark",
    withdateranges: true,
    hide_top_toolbar: true,
    hide_legend: false,
    allow_symbol_change: true,
    datafeed: createTradingViewDatafeed(config.marketDataAdapter),
    save_load_adapter: createTradingViewSaveLoadAdapter(config.persistenceAdapter),
    settings_adapter: createTradingViewSettingsAdapter(
      config.persistenceAdapter,
      {
        theme: config.theme,
        favorite_intervals: ["15", "60", "1D", "1W"],
        favorite_indicators: config.enabledIndicators,
        watchlist_symbols: [config.symbol],
        last_symbol: config.symbol,
        last_interval: config.interval,
        left_toolbar_open: true,
        right_sidebar_open: true,
        updated_at: "",
      }
    ),
    disabled_features: [
      "use_localstorage_for_settings",
      "save_chart_properties_to_local_storage",
      "header_symbol_search",
      "header_interval_dialog_button",
    ],
    enabled_features: ["study_templates"],
    studies: config.enabledIndicators,
    saved_data: config.activeLayout?.payload.tv_chart_content || undefined,
  };
}

let tradingViewScriptPromise: Promise<void> | null = null;

export function loadTradingViewLibrary(): Promise<void> {
  const libraryPath = getTradingViewLibraryPath();
  if (!libraryPath) {
    return Promise.reject(new Error("TradingView library path is not configured."));
  }

  if (typeof window === "undefined") {
    return Promise.reject(new Error("TradingView can only load in the browser."));
  }

  if (window.TradingView?.widget) {
    return Promise.resolve();
  }

  if (tradingViewScriptPromise) {
    return tradingViewScriptPromise;
  }

  tradingViewScriptPromise = new Promise<void>((resolve, reject) => {
    const existing = document.querySelector<HTMLScriptElement>(
      'script[data-unveni-tradingview="true"]'
    );

    if (existing) {
      existing.addEventListener("load", () => resolve(), { once: true });
      existing.addEventListener(
        "error",
        () => reject(new Error("TradingView library failed to load.")),
        { once: true }
      );
      return;
    }

    const script = document.createElement("script");
    script.src = `${libraryPath}/charting_library.js`;
    script.async = true;
    script.dataset.unveniTradingview = "true";
    script.onload = () => resolve();
    script.onerror = () => reject(new Error("TradingView library failed to load."));
    document.head.appendChild(script);
  });

  return tradingViewScriptPromise;
}
