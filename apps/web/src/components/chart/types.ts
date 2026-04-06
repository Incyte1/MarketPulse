import type { ComponentType } from "react";

export type ChartTimeframe = "1min" | "5min" | "15min";

export interface ChartModel {
  symbol: string;
  timeframe: string;
  headline?: string;
  notes?: string[];
  dataQuality?: "provider" | "fallback" | "mixed";
  dataSource?: string;
  renderMode?: "embedded" | "full";
}

export interface ChartProviderProps {
  model: ChartModel;
}

export interface ChartProviderDefinition {
  id: string;
  label: string;
  capabilities: {
    indicators: boolean;
    drawings: boolean;
    streaming: boolean;
  };
  Component: ComponentType<ChartProviderProps>;
}
