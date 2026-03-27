export type ChartThemeMode = "dark" | "light";

export type ChartTool =
  | "cursor"
  | "trend_line"
  | "horizontal_ray"
  | "fib_retracement"
  | "rectangle";

export type ChartTimeframe = "15" | "60" | "1D" | "1W";

export type ChartLayoutPayload = {
  symbol: string;
  interval: string;
  theme: ChartThemeMode;
  indicators: string[];
  drawings: Array<Record<string, unknown>>;
  active_tool: ChartTool;
  notes: string;
  tv_chart_content: Record<string, unknown>;
};

export type ChartLayoutSummary = {
  id: number;
  name: string;
  symbol: string;
  interval: string;
  theme: ChartThemeMode;
  is_default: boolean;
  updated_at: string;
};

export type ChartLayoutDocument = {
  id: number;
  name: string;
  symbol: string;
  interval: string;
  theme: ChartThemeMode;
  is_default: boolean;
  created_at: string;
  updated_at: string;
  payload: ChartLayoutPayload;
};

export type ChartLayoutSaveRequest = {
  name: string;
  symbol: string;
  interval: string;
  theme: ChartThemeMode;
  is_default?: boolean;
  payload: ChartLayoutPayload;
};

export type ChartUserSettings = {
  theme: ChartThemeMode;
  favorite_intervals: string[];
  favorite_indicators: string[];
  watchlist_symbols: string[];
  last_symbol: string;
  last_interval: string;
  left_toolbar_open: boolean;
  right_sidebar_open: boolean;
  updated_at: string;
};

export type ChartUserSettingsUpdate = Partial<
  Omit<ChartUserSettings, "updated_at">
>;

export type ChartingBootstrap = {
  layouts: ChartLayoutSummary[];
  settings: ChartUserSettings;
};

export interface ChartPersistenceAdapter {
  mode: "backend" | "mock";
  getBootstrap(): Promise<ChartingBootstrap>;
  loadLayout(layoutId: number): Promise<ChartLayoutDocument>;
  createLayout(payload: ChartLayoutSaveRequest): Promise<ChartLayoutDocument>;
  updateLayout(
    layoutId: number,
    payload: Partial<ChartLayoutSaveRequest>
  ): Promise<ChartLayoutDocument>;
  saveSettings(payload: ChartUserSettingsUpdate): Promise<ChartUserSettings>;
}

export type ChartInstrument = {
  symbol: string;
  name: string;
};
