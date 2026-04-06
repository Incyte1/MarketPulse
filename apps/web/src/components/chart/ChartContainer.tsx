import { getChartProvider } from "./providers";
import type { ChartModel } from "./types";

interface ChartContainerProps {
  symbol: string;
  dataQuality?: "provider" | "fallback" | "mixed";
  dataSource?: string;
  providerId?: string;
  timeframe?: string;
  title?: string;
  notes?: string[];
}

export function ChartContainer({
  symbol,
  dataQuality,
  dataSource,
  providerId,
  timeframe = "5min",
  title,
  notes
}: ChartContainerProps) {
  const provider = getChartProvider(providerId);
  const Provider = provider.Component;
  const model: ChartModel = {
    symbol,
    dataQuality,
    dataSource,
    timeframe,
    headline: title,
    notes
  };

  return (
    <section className="chartPanel">
      <div className="sectionSubheader">
        <p className="eyebrow">{title ?? "Underlying chart"}</p>
        <span className="sectionMeta">{provider.label}</span>
      </div>
      <div className="chartSurface">
        <Provider model={model} />
      </div>
    </section>
  );
}
