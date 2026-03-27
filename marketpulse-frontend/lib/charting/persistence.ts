import { getStoredSession } from "@/lib/auth";
import type {
  ChartLayoutDocument,
  ChartLayoutPayload,
  ChartLayoutSummary,
  ChartPersistenceAdapter,
  ChartUserSettings,
  ChartingBootstrap,
} from "@/lib/charting/types";

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://127.0.0.1:8000";
const MOCK_STORAGE_KEY = "unveni_charting_mock_v1";

type MockChartState = {
  layouts: ChartLayoutDocument[];
  settings: ChartUserSettings;
};

function defaultSettings(): ChartUserSettings {
  return {
    theme: "dark",
    favorite_intervals: ["15", "60", "1D", "1W"],
    favorite_indicators: ["VWAP", "EMA 20", "EMA 50", "Volume"],
    watchlist_symbols: ["SPY", "QQQ", "NVDA", "MSFT"],
    last_symbol: "SPY",
    last_interval: "60",
    left_toolbar_open: true,
    right_sidebar_open: true,
    updated_at: new Date().toISOString(),
  };
}

function defaultPayload(
  symbol = "SPY",
  interval = "60",
  theme: "dark" | "light" = "dark"
): ChartLayoutPayload {
  return {
    symbol,
    interval,
    theme,
    indicators: ["VWAP", "EMA 20", "Volume"],
    drawings: [],
    active_tool: "cursor",
    notes: "Primary chart desk.",
    tv_chart_content: {},
  };
}

function defaultMockState(): MockChartState {
  const now = new Date().toISOString();
  return {
    layouts: [
      {
        id: 1,
        name: "Primary Layout",
        symbol: "SPY",
        interval: "60",
        theme: "dark",
        is_default: true,
        created_at: now,
        updated_at: now,
        payload: defaultPayload(),
      },
    ],
    settings: defaultSettings(),
  };
}

function readMockState(): MockChartState {
  if (typeof window === "undefined") {
    return defaultMockState();
  }

  const raw = window.localStorage.getItem(MOCK_STORAGE_KEY);
  if (!raw) {
    const state = defaultMockState();
    window.localStorage.setItem(MOCK_STORAGE_KEY, JSON.stringify(state));
    return state;
  }

  try {
    const parsed = JSON.parse(raw) as MockChartState;
    return {
      layouts: parsed.layouts?.length ? parsed.layouts : defaultMockState().layouts,
      settings: parsed.settings ?? defaultSettings(),
    };
  } catch {
    const state = defaultMockState();
    window.localStorage.setItem(MOCK_STORAGE_KEY, JSON.stringify(state));
    return state;
  }
}

function writeMockState(state: MockChartState) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(MOCK_STORAGE_KEY, JSON.stringify(state));
}

function summarize(layout: ChartLayoutDocument): ChartLayoutSummary {
  return {
    id: layout.id,
    name: layout.name,
    symbol: layout.symbol,
    interval: layout.interval,
    theme: layout.theme,
    is_default: layout.is_default,
    updated_at: layout.updated_at,
  };
}

async function apiRequest<T>(
  path: string,
  init?: RequestInit,
  token?: string | null
): Promise<T> {
  const headers = new Headers(init?.headers);
  headers.set("Content-Type", "application/json");
  if (token) {
    headers.set("Authorization", `Bearer ${token}`);
  }

  const response = await fetch(`${API_BASE}${path}`, {
    ...init,
    headers,
    cache: "no-store",
  });

  if (!response.ok) {
    const text = await response.text();
    let message = text;

    try {
      const parsed = JSON.parse(text) as { detail?: string };
      message = parsed.detail || text;
    } catch {
      message = text;
    }

    throw new Error(message || `Request failed: ${response.status}`);
  }

  return response.json() as Promise<T>;
}

export function createMockChartPersistenceAdapter(): ChartPersistenceAdapter {
  return {
    mode: "mock",
    async getBootstrap() {
      const state = readMockState();
      return {
        layouts: state.layouts.map(summarize).sort((left, right) => {
          if (left.is_default !== right.is_default) return left.is_default ? -1 : 1;
          return right.updated_at.localeCompare(left.updated_at);
        }),
        settings: state.settings,
      };
    },
    async loadLayout(layoutId) {
      const state = readMockState();
      const layout = state.layouts.find((item) => item.id === layoutId);
      if (!layout) {
        throw new Error("Chart layout not found.");
      }
      return layout;
    },
    async createLayout(payload) {
      const state = readMockState();
      const now = new Date().toISOString();
      const nextId =
        state.layouts.reduce((highest, item) => Math.max(highest, item.id), 0) + 1;

      const layout: ChartLayoutDocument = {
        id: nextId,
        name: payload.name,
        symbol: payload.symbol,
        interval: payload.interval,
        theme: payload.theme,
        is_default: Boolean(payload.is_default),
        created_at: now,
        updated_at: now,
        payload: payload.payload,
      };

      const nextLayouts = payload.is_default
        ? state.layouts.map((item) => ({ ...item, is_default: false }))
        : state.layouts;

      writeMockState({
        ...state,
        layouts: [layout, ...nextLayouts],
      });

      return layout;
    },
    async updateLayout(layoutId, payload) {
      const state = readMockState();
      const existing = state.layouts.find((item) => item.id === layoutId);
      if (!existing) {
        throw new Error("Chart layout not found.");
      }

      const nextLayout: ChartLayoutDocument = {
        ...existing,
        name: payload.name ?? existing.name,
        symbol: payload.symbol ?? existing.symbol,
        interval: payload.interval ?? existing.interval,
        theme: payload.theme ?? existing.theme,
        is_default: payload.is_default ?? existing.is_default,
        updated_at: new Date().toISOString(),
        payload: {
          ...(payload.payload ?? existing.payload),
          symbol: payload.symbol ?? payload.payload?.symbol ?? existing.symbol,
          interval: payload.interval ?? payload.payload?.interval ?? existing.interval,
          theme: payload.theme ?? payload.payload?.theme ?? existing.theme,
        },
      };

      const nextLayouts = state.layouts.map((item) =>
        item.id === layoutId
          ? nextLayout
          : nextLayout.is_default
            ? { ...item, is_default: false }
            : item
      );

      writeMockState({
        ...state,
        layouts: nextLayouts,
      });

      return nextLayout;
    },
    async saveSettings(payload) {
      const state = readMockState();
      const settings: ChartUserSettings = {
        ...state.settings,
        ...payload,
        updated_at: new Date().toISOString(),
      };
      writeMockState({
        ...state,
        settings,
      });
      return settings;
    },
  };
}

export function createBackendChartPersistenceAdapter(
  token: string
): ChartPersistenceAdapter {
  return {
    mode: "backend",
    getBootstrap() {
      return apiRequest<ChartingBootstrap>("/api/charting/bootstrap", { method: "GET" }, token);
    },
    loadLayout(layoutId) {
      return apiRequest<ChartLayoutDocument>(
        `/api/charting/layouts/${layoutId}`,
        { method: "GET" },
        token
      );
    },
    createLayout(payload) {
      return apiRequest<ChartLayoutDocument>(
        "/api/charting/layouts",
        {
          method: "POST",
          body: JSON.stringify(payload),
        },
        token
      );
    },
    updateLayout(layoutId, payload) {
      return apiRequest<ChartLayoutDocument>(
        `/api/charting/layouts/${layoutId}`,
        {
          method: "PUT",
          body: JSON.stringify(payload),
        },
        token
      );
    },
    saveSettings(payload) {
      return apiRequest<ChartUserSettings>(
        "/api/charting/settings",
        {
          method: "PUT",
          body: JSON.stringify(payload),
        },
        token
      );
    },
  };
}

export function createDefaultChartPersistenceAdapter(): ChartPersistenceAdapter {
  const session = getStoredSession();
  if (session?.token) {
    return createBackendChartPersistenceAdapter(session.token);
  }
  return createMockChartPersistenceAdapter();
}
