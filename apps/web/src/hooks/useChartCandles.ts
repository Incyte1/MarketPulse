import { getIntradayMarketCandles, toErrorMessage } from "../lib/api";
import type { CandleHistoryResponse } from "../lib/contracts";
import type { ChartTimeframe } from "../components/chart/types";
import { useResource } from "./useResource";

const LIMIT_BY_TIMEFRAME: Record<ChartTimeframe, number> = {
  "1min": 180,
  "5min": 144,
  "15min": 120
};

export function useChartCandles(
  symbol: string,
  timeframe: ChartTimeframe,
  enabled: boolean
) {
  return useResource<CandleHistoryResponse>(
    async (signal) => {
      try {
        return await getIntradayMarketCandles(
          symbol,
          timeframe,
          LIMIT_BY_TIMEFRAME[timeframe],
          signal
        );
      } catch (error) {
        throw new Error(toErrorMessage(error));
      }
    },
    [symbol, timeframe],
    {
      enabled,
      refreshIntervalMs: 30_000
    }
  );
}
