import Link from "next/link";
import LineChart from "@/components/market/LineChart";
import Panel from "@/components/ui/Panel";
import {
  getResearchMemo,
  getSymbolRecord,
  symbols,
} from "@/lib/mock-unveni";
import {
  formatCurrency,
  formatDateLabel,
  formatSignedPercent,
} from "@/lib/utils";

export const dynamicParams = false;

export function generateStaticParams() {
  return symbols.map((item) => ({
    symbol: item.symbol.toLowerCase(),
  }));
}

export default async function SymbolPage({
  params,
}: {
  params: Promise<{ symbol: string }>;
}) {
  const { symbol } = await params;
  const record = getSymbolRecord(symbol);
  const relatedResearch = record.relatedResearch.map((slug) => getResearchMemo(slug));

  return (
    <>
      <Panel className="p-6 sm:p-7 reveal-up">
        <div className="grid gap-8 xl:grid-cols-[1.05fr_0.95fr]">
          <div>
            <div className="eyebrow">{record.exchange}</div>
            <h1 className="mt-3 flex flex-wrap items-end gap-4 text-[clamp(2.6rem,5vw,4.8rem)] leading-[0.92]">
              <span>{record.symbol}</span>
              <span className="pb-2 text-sm font-medium uppercase tracking-[0.26em] text-[color:var(--text-soft)]">
                {record.name}
              </span>
            </h1>
            <p className="mt-5 max-w-[44rem] text-base leading-8 text-[color:var(--text-main)]">
              {record.thesisHeadline}
            </p>
          </div>

          <div className="workspace-summary-grid !grid-cols-1 sm:!grid-cols-2">
            <div className="workspace-stat">
              <div className="eyebrow">Spot</div>
              <div className="mt-3 text-2xl font-semibold text-[color:var(--text-strong)]">
                {formatCurrency(record.price)}
              </div>
              <div
                className={`mt-2 text-sm ${
                  record.changePercent >= 0 ? "signal-positive" : "signal-negative"
                }`}
              >
                {formatSignedPercent(record.changePercent)}
              </div>
            </div>

            <div className="workspace-stat">
              <div className="eyebrow">Sector</div>
              <div className="mt-3 text-2xl font-semibold text-[color:var(--text-strong)]">
                {record.sector}
              </div>
              <div className="mt-2 text-sm text-[color:var(--text-muted)]">Primary market context</div>
            </div>

            <div className="workspace-stat">
              <div className="eyebrow">Market Cap</div>
              <div className="mt-3 text-2xl font-semibold text-[color:var(--text-strong)]">
                {record.marketCap}
              </div>
              <div className="mt-2 text-sm text-[color:var(--text-muted)]">Size of the operating franchise</div>
            </div>

            <div className="workspace-stat">
              <div className="eyebrow">Liquidity</div>
              <div className="mt-3 text-2xl font-semibold text-[color:var(--text-strong)]">
                {record.liquidity}
              </div>
              <div className="mt-2 text-sm text-[color:var(--text-muted)]">Execution quality reference</div>
            </div>
          </div>
        </div>
      </Panel>

      <Panel className="p-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="eyebrow">Chart Surface</div>
            <div className="mt-2 text-xl font-semibold text-[color:var(--text-strong)]">
              Structure and level map
            </div>
          </div>

          <Link href="/workspace" prefetch={false} className="action-button-secondary px-4 py-3 text-sm">
            Back To Dashboard
          </Link>
        </div>

        <div className="mt-6 h-[22rem] overflow-hidden rounded-[20px] border border-[color:var(--line)] bg-[rgba(255,255,255,0.018)]">
          <LineChart
            points={record.chartSeries}
            height={360}
            tone={record.changePercent >= 0 ? "positive" : "accent"}
          />
        </div>

        <div className="workspace-table mt-6">
          {record.keyLevels.map((level) => (
            <div
              key={level.label}
              className="workspace-table-row grid-cols-1 md:grid-cols-[160px_120px_minmax(0,1fr)]"
            >
              <div className="text-sm font-semibold text-[color:var(--text-strong)]">{level.label}</div>
              <div className="text-sm text-[color:var(--text-main)]">{level.value}</div>
              <div className="text-sm text-[color:var(--text-soft)]">{level.note}</div>
            </div>
          ))}
        </div>
      </Panel>

      <div className="workspace-grid xl:grid-cols-[1.1fr_0.9fr]">
        <Panel className="p-6">
          <div className="eyebrow">Thesis Summary</div>
          <div className="mt-2 text-xl font-semibold text-[color:var(--text-strong)]">
            What matters now
          </div>

          <div className="workspace-callout mt-6">{record.thesisSummary}</div>

          <div className="mt-6 space-y-5">
            {record.thesisBody.map((paragraph) => (
              <p key={paragraph} className="text-sm leading-8 text-[color:var(--text-muted)]">
                {paragraph}
              </p>
            ))}
          </div>
        </Panel>

        <Panel className="p-6">
          <div className="eyebrow">Sentiment</div>
          <div className="mt-2 text-xl font-semibold text-[color:var(--text-strong)]">
            Street tone and risk posture
          </div>

          <div className="workspace-table mt-6">
            {record.sentiment.map((item) => (
              <div
                key={item.label}
                className="workspace-table-row grid-cols-1 md:grid-cols-[150px_140px_minmax(0,1fr)]"
              >
                <div className="text-sm font-medium text-[color:var(--text-strong)]">{item.label}</div>
                <div className="text-sm text-[color:var(--text-main)]">{item.value}</div>
                <div className="text-sm text-[color:var(--text-soft)]">{item.note}</div>
              </div>
            ))}
          </div>

          <div className="workspace-callout mt-6">{record.riskSummary}</div>
        </Panel>
      </div>

      <div className="workspace-grid xl:grid-cols-[1fr_1fr]">
        <Panel className="p-6">
          <div className="eyebrow">Catalyst Timeline</div>
          <div className="mt-2 text-xl font-semibold text-[color:var(--text-strong)]">
            Upcoming events and flow points
          </div>

          <div className="workspace-table mt-8">
            {record.catalysts.map((item) => (
              <div
                key={`${item.date}-${item.title}`}
                className="workspace-table-row grid-cols-1 md:grid-cols-[110px_90px_minmax(0,1fr)]"
              >
                <div className="text-sm font-semibold text-[color:var(--text-strong)]">
                  {formatDateLabel(item.date)}
                </div>
                <div className="text-xs uppercase tracking-[0.22em] text-[color:var(--text-soft)]">
                  {item.impact}
                </div>
                <div>
                  <div className="text-sm font-medium text-[color:var(--text-strong)]">{item.title}</div>
                  <div className="mt-2 text-sm leading-7 text-[color:var(--text-muted)]">
                    {item.summary}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </Panel>

        <Panel className="p-6">
          <div className="eyebrow">Risk Stack</div>
          <div className="mt-2 text-xl font-semibold text-[color:var(--text-strong)]">
            What can break the read
          </div>

          <div className="workspace-table mt-8">
            {record.riskItems.map((item) => (
              <div key={item} className="workspace-table-row grid-cols-1">
                <div className="text-sm leading-8 text-[color:var(--text-muted)]">{item}</div>
              </div>
            ))}
          </div>
        </Panel>
      </div>

      <div className="workspace-grid xl:grid-cols-[0.95fr_1.05fr]">
        <Panel className="p-6">
          <div className="eyebrow">Related Research</div>
          <div className="mt-2 text-xl font-semibold text-[color:var(--text-strong)]">
            Connected memo flow
          </div>

          <div className="workspace-table mt-8">
            {relatedResearch.map((memo) => (
              <Link
                key={memo.slug}
                href={`/workspace/research/${memo.slug}`}
                prefetch={false}
                className="workspace-table-row grid-cols-1 md:grid-cols-[90px_minmax(0,1fr)]"
              >
                <div className="text-sm font-semibold text-[color:var(--text-strong)]">
                  {memo.symbol}
                </div>
                <div>
                  <div className="text-base font-medium text-[color:var(--text-strong)]">
                    {memo.title}
                  </div>
                  <div className="mt-2 text-sm leading-7 text-[color:var(--text-muted)]">
                    {memo.executiveSummary}
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </Panel>

        <Panel className="p-6">
          <div className="eyebrow">Related News</div>
          <div className="mt-2 text-xl font-semibold text-[color:var(--text-strong)]">
            Source-linked headlines
          </div>

          <div className="workspace-table mt-8">
            {record.relatedNews.map((item) => (
              <div
                key={`${item.source}-${item.title}`}
                className="workspace-table-row grid-cols-1 md:grid-cols-[120px_minmax(0,1fr)]"
              >
                <div className="text-sm font-semibold text-[color:var(--text-strong)]">
                  {item.source}
                </div>
                <div>
                  <div className="text-base font-medium text-[color:var(--text-strong)]">
                    {item.title}
                  </div>
                  <div className="mt-2 text-sm leading-7 text-[color:var(--text-muted)]">
                    {item.summary}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </Panel>
      </div>
    </>
  );
}
