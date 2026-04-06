import type { ChartProviderDefinition } from "../types";
import { lightweightChartProvider } from "./lightweight";
import { placeholderChartProvider } from "./placeholder";

const providers: Record<string, ChartProviderDefinition> = {
  [lightweightChartProvider.id]: lightweightChartProvider,
  [placeholderChartProvider.id]: placeholderChartProvider
};

export function getChartProvider(providerId?: string) {
  if (providerId && providerId in providers) {
    return providers[providerId];
  }

  return lightweightChartProvider;
}
