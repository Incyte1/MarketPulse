import Link from "next/link";
import LineChart from "@/components/market/LineChart";
import Panel from "@/components/ui/Panel";
import {
  dashboardSnapshot,
  defaultSymbol,
  researchMemos,
  symbols,
} from "@/lib/mock-unveni";
import {
  formatCurrency,
  formatDateLabel,
  formatSignedPercent,
} from "@/lib/utils";

const activeSymbol = defaultSymbol;
const catalysts = symbols.flatMap((item) =>
  item.catalysts.map((catalyst) => ({
    ...catalyst,
    symbol: item.symbol,
  }))
);

export default function WorkspacePage() {
  return (
    <>
      <Panel className="p-6 sm:p-7 reveal-up">
        <div className="grid gap-10 xl:grid-cols-[1.15fr_0.85fr]">
          <div>
            <div className="eyebrow">Daily Desk</div>
            <h1 className="mt-3 max-w-[12ch] text-[clamp(2.4rem,4.8vw,4.4rem)] leading-[0.94]">
              Current market posture and the active research queue.
            </h1>
            <p className="mt-5 max-w-[44rem] text-base leading-8 text-[color:var(--text-muted)]">
              {dashboardSnapshot.marketBackdrop}
            </p>
          </div>

          <div className="workspace-summary-grid !grid-cols-1 sm:!grid-cols-2">
            <div className="workspace-stat">
              <div className="eyebrow">Focus Symbol</div>
              <div className="mt-3 text-2xl font-semibold text-[color:var(--text-strong)]">
                {activeSymbol.symbol}
              </div>
              <div className="mt-2 text-sm text-[color:var(--text-muted)]">
                {activeSymbol.thesisHeadline}
              </div>
            </div>

            <div className="workspace-stat">
              <div className="eyebrow">Research Queue</div>
              <div className="mt-3 text-2xl font-semibold text-[color:var(--text-strong)]">
                {researchMemos.length}
              </div>
              <div className="mt-2 text-sm text-[color:var(--text-muted)]">
                Published memos connected to active coverage.
              </div>
            </div>

            <div className="workspace-stat">
              <div className="eyebrow">High Impact Catalysts</div>
              <div className="mt-3 text-2xl font-semibold text-[color:var(--text-strong)]">
                {catalysts.filter((item) => item.impact === "High").length}
              </div>
              <div className="mt-2 text-sm text-[color:var(--text-muted)]">
                Events that can change positioning this week.
              </div>
            </div>

            <div className="workspace-stat">
              <div className="eyebrow">Desk Bias</div>
              <div className="mt-3 text-2xl font-semibold text-[color:var(--text-strong)]">
                Constructive
              </div>
              <div className="mt-2 text-sm text-[color:var(--text-muted)]">
                Positive with selectivity around crowded leadership.
              </div>
            </div>
          </div>
        </div>
      </Panel>

      <div className="workspace-grid 2xl:grid-cols-[1.05fr_1fr_0.88fr] xl:grid-cols-[1.05fr_1fr]">
        <Panel className="p-6">
          <div className="flex items-start justify-between gap-3">
            <div>
              <div className="eyebrow">Watchlist</div>
              <div className="mt-2 text-xl font-semibold text-[color:var(--text-strong)]">
                Coverage with the cleanest decision value
              </div>
            </div>
            <div className="text-sm text-[color:var(--text-soft)]">
              {dashboardSnapshot.watchlist.length} active names
            </div>
          </div>

          <div className="workspace-table mt-8">
            {dashboardSnapshot.watchlist.map((item) => {
              const symbol = symbols.find((entry) => entry.symbol === item.symbol) ?? activeSymbol;

              return (
                <Link
                  key={item.symbol}
                  href={`/workspace/symbol/${item.symbol.toLowerCase()}`}
                  prefetch={false}
                  className="workspace-table-row grid-cols-1 md:grid-cols-[90px_minmax(0,1.1fr)_120px_180px_90px]"
                >
                  <div>
                    <div className="text-sm font-semibold text-[color:var(--text-strong)]">
                      {item.symbol}
                    </div>
                    <div className="mt-1 text-xs text-[color:var(--text-soft)]">{symbol.sector}</div>
                  </div>

                  <div className="text-sm text-[color:var(--text-muted)]">{item.bias}</div>
                  <div className="text-sm text-[color:var(--text-main)]">{item.nextCatalyst}</div>
                  <div className="text-sm text-[color:var(--text-soft)]">{item.risk}</div>
                  <div
                    className={`text-right text-sm font-medium ${
                      symbol.changePercent >= 0 ? "signal-positive" : "signal-negative"
                    }`}
                  >
                    {formatSignedPercent(symbol.changePercent)}
                  </div>
                </Link>
              );
            })}
          </div>
        </Panel>

        <Panel className="p-6">
          <div className="flex items-start justify-between gap-4">
            <div>
              <div className="eyebrow">Multi-Horizon Read</div>
              <div className="mt-2 text-xl font-semibold text-[color:var(--text-strong)]">
                {activeSymbol.symbol} remains the active focus name
              </div>
            </div>

            <Link
              href={`/workspace/symbol/${activeSymbol.symbol.toLowerCase()}`}
              prefetch={false}
              className="action-button-secondary px-4 py-3 text-sm"
            >
              Open Detail
            </Link>
          </div>

          <div className="mt-6 h-56 overflow-hidden rounded-[20px] border border-[color:var(--line)] bg-[rgba(255,255,255,0.018)]">
            <LineChart points={activeSymbol.chartSeries} />
          </div>

          <div className="workspace-table mt-6">
            {activeSymbol.horizons.map((item) => (
              <div
                key={item.horizon}
                className="workspace-table-row grid-cols-1 md:grid-cols-[120px_140px_120px_minmax(0,1fr)]"
              >
                <div className="text-sm font-semibold text-[color:var(--text-strong)]">
                  {item.horizon}
                </div>
                <div className="text-sm text-[color:var(--text-main)]">{item.bias}</div>
                <div className="text-sm text-[color:var(--text-soft)]">{item.conviction}</div>
                <div className="text-sm text-[color:var(--text-muted)]">{item.summary}</div>
              </div>
            ))}
          </div>

          <div className="workspace-callout mt-6">{activeSymbol.thesisSummary}</div>
        </Panel>

        <Panel className="p-6 2xl:block xl:col-span-2">
          <div className="eyebrow">Catalyst Queue</div>
          <div className="mt-2 text-xl font-semibold text-[color:var(--text-strong)]">
            What can move positioning next
          </div>

          <div className="workspace-table mt-8">
            {catalysts
              .sort((left, right) => left.date.localeCompare(right.date))
              .slice(0, 6)
              .map((item) => (
                <div
                  key={`${item.symbol}-${item.title}`}
                  className="workspace-table-row grid-cols-1 md:grid-cols-[84px_88px_minmax(0,1fr)]"
                >
                  <div className="text-sm font-semibold text-[color:var(--text-strong)]">
                    {item.symbol}
                  </div>
                  <div className="text-xs uppercase tracking-[0.2em] text-[color:var(--text-soft)]">
                    {formatDateLabel(item.date)}
                  </div>
                  <div>
                    <div className="text-sm font-medium text-[color:var(--text-strong)]">
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

      <div className="workspace-grid xl:grid-cols-[0.85fr_1.15fr]">
        <Panel className="p-6">
          <div className="eyebrow">Bias And Risk</div>
          <div className="mt-2 text-xl font-semibold text-[color:var(--text-strong)]">
            Desk summary for the current tape
          </div>

          <div className="workspace-callout mt-6">{activeSymbol.riskSummary}</div>

          <div className="workspace-table mt-6">
            {dashboardSnapshot.riskSummary.map((item) => (
              <div key={item} className="workspace-table-row grid-cols-1">
                <div className="text-sm leading-8 text-[color:var(--text-muted)]">{item}</div>
              </div>
            ))}
          </div>

          <div className="workspace-table mt-6">
            {activeSymbol.sentiment.map((item) => (
              <div
                key={item.label}
                className="workspace-table-row grid-cols-1 md:grid-cols-[140px_140px_minmax(0,1fr)]"
              >
                <div className="text-sm font-medium text-[color:var(--text-strong)]">{item.label}</div>
                <div className="text-sm text-[color:var(--text-main)]">{item.value}</div>
                <div className="text-sm text-[color:var(--text-soft)]">{item.note}</div>
              </div>
            ))}
          </div>
        </Panel>

        <Panel className="p-6">
          <div className="flex items-start justify-between gap-3">
            <div>
              <div className="eyebrow">Recent Research</div>
              <div className="mt-2 text-xl font-semibold text-[color:var(--text-strong)]">
                Published memo flow
              </div>
            </div>
            <div className="text-sm text-[color:var(--text-soft)]">Updated continuously</div>
          </div>

          <div className="workspace-table mt-8">
            {researchMemos.map((memo) => (
              <Link
                key={memo.slug}
                href={`/workspace/research/${memo.slug}`}
                prefetch={false}
                className="workspace-table-row grid-cols-1 md:grid-cols-[100px_minmax(0,1fr)_120px]"
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
                <div className="text-right text-sm text-[color:var(--text-soft)]">
                  {formatDateLabel(memo.publishedAt)}
                </div>
              </Link>
            ))}
          </div>
        </Panel>
      </div>
    </>
  );
}
