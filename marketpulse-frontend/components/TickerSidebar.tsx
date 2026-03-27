"use client";

import { useMemo, useState } from "react";

type Props = {
  symbol: string;
  horizon: "short_term" | "long_term";
  onSelect: (ticker: string) => void;
  onAnalyze: (ticker: string) => void;
};

type SidebarTab = "favorites" | "hot" | "trending" | "etfs" | "tech" | "all";

const TAB_ITEMS: Record<SidebarTab, string[]> = {
  favorites: ["SPY", "QQQ", "AAPL", "NVDA", "TSLA"],
  hot: ["NVDA", "SMCI", "AMD", "PLTR", "AVGO"],
  trending: ["TSLA", "META", "AMZN", "NFLX", "GOOGL"],
  etfs: ["SPY", "QQQ", "IWM", "DIA"],
  tech: ["AAPL", "MSFT", "NVDA", "AMD", "META", "GOOGL"],
  all: [
    "SPY",
    "QQQ",
    "IWM",
    "DIA",
    "AAPL",
    "MSFT",
    "NVDA",
    "AMD",
    "TSLA",
    "META",
    "AMZN",
    "GOOGL",
    "NFLX",
    "PLTR",
    "AVGO",
    "SMCI",
    "MU",
    "INTC",
    "CRM",
    "ADBE",
    "JPM",
    "BAC",
    "GS",
    "WFC",
    "XOM",
    "CVX",
    "COP",
    "SLB",
    "UNH",
    "JNJ",
    "PFE",
    "LLY",
    "MRK",
    "KO",
    "PEP",
    "MCD",
    "NKE",
    "WMT",
    "COST",
    "HD",
  ],
};

const TAB_META: Record<SidebarTab, { label: string; note: string }> = {
  favorites: { label: "Core", note: "Default desk queue" },
  hot: { label: "Heat", note: "Fast movers" },
  trending: { label: "Catalysts", note: "Event pressure" },
  etfs: { label: "ETFs", note: "Market proxies" },
  tech: { label: "Tech", note: "Mega-cap tape" },
  all: { label: "Universe", note: "Expanded coverage" },
};

const ETF_SET = new Set(["SPY", "QQQ", "IWM", "DIA"]);
const TECH_SET = new Set([
  "AAPL",
  "MSFT",
  "NVDA",
  "AMD",
  "META",
  "AMZN",
  "GOOGL",
  "NFLX",
  "PLTR",
  "AVGO",
  "SMCI",
  "MU",
  "INTC",
  "CRM",
  "ADBE",
]);
const FINANCIAL_SET = new Set(["JPM", "BAC", "GS", "WFC"]);
const ENERGY_SET = new Set(["XOM", "CVX", "COP", "SLB"]);
const DEFENSIVE_SET = new Set(["UNH", "JNJ", "PFE", "LLY", "MRK", "KO", "PEP", "MCD", "NKE", "WMT", "COST", "HD"]);

function tickerCategory(ticker: string) {
  if (ETF_SET.has(ticker)) return "ETF";
  if (TECH_SET.has(ticker)) return "Tech";
  if (FINANCIAL_SET.has(ticker)) return "Financials";
  if (ENERGY_SET.has(ticker)) return "Energy";
  if (DEFENSIVE_SET.has(ticker)) return "Defensive";
  return "Coverage";
}

export default function TickerSidebar({ symbol, horizon, onSelect, onAnalyze }: Props) {
  const [query, setQuery] = useState("");
  const [tab, setTab] = useState<SidebarTab>("favorites");

  const visibleItems = useMemo(() => {
    const items = TAB_ITEMS[tab];
    const q = query.trim().toUpperCase();

    if (!q) return items;
    return items.filter((item) => item.includes(q));
  }, [tab, query]);

  const universeCount = useMemo(() => new Set(Object.values(TAB_ITEMS).flat()).size, []);

  return (
    <aside className="h-full 2xl:sticky 2xl:top-6">
      <section className="frame-shell reveal-up reveal-delay-1 flex min-h-0 flex-col overflow-hidden p-0 2xl:min-h-[calc(100svh-3rem)]">
        <div className="border-b border-white/10 px-4 py-4">
          <div className="flex items-start justify-between gap-3">
            <div>
              <div className="eyebrow">Scanner Rail</div>
              <div className="mt-2 text-lg font-semibold text-white">Coverage universe</div>
              <div className="mt-2 text-sm leading-7 text-[var(--text-soft)]">
                Search the tape or move through the active review buckets.
              </div>
            </div>
            <div className="flex flex-col items-end gap-2">
              <span className="desk-chip desk-chip-info mono">
                {horizon === "short_term" ? "1D / 1H" : "1W / 1D"}
              </span>
              <span className="desk-chip mono">{universeCount} symbols</span>
            </div>
          </div>

          <form
            className="mt-4"
            onSubmit={(event) => {
              event.preventDefault();
              const value = query.trim().toUpperCase();
              if (!value) return;
              onSelect(value);
              onAnalyze(value);
            }}
          >
            <label className="field-label" htmlFor="ticker-search">
              Search Ticker
            </label>
            <div className="mt-2 flex gap-2">
              <input
                id="ticker-search"
                className="text-input"
                value={query}
                onChange={(event) => setQuery(event.target.value.toUpperCase())}
                placeholder="NVDA"
              />
              <button className="action-button min-w-[78px]" type="submit">
                Go
              </button>
            </div>
          </form>
        </div>

        <div className="border-b border-white/10 px-3 py-3">
          <div className="grid grid-cols-3 gap-2 sm:grid-cols-6 2xl:grid-cols-3">
            {(Object.keys(TAB_ITEMS) as SidebarTab[]).map((item) => (
              <button
                key={item}
                type="button"
                className={`rounded-[16px] border px-2 py-2.5 text-xs transition ${
                  tab === item
                    ? "border-[rgba(134,248,111,0.24)] bg-[rgba(134,248,111,0.1)] text-white"
                    : "border-white/8 bg-white/[0.02] text-[var(--text-muted)] hover:border-white/16"
                }`}
                onClick={() => setTab(item)}
              >
                {TAB_META[item].label}
              </button>
            ))}
          </div>
        </div>

        <div className="flex items-center justify-between border-b border-white/10 px-4 py-3">
          <div>
            <div className="text-sm font-semibold text-white">{TAB_META[tab].label}</div>
            <div className="mt-1 text-xs text-[var(--text-soft)]">{TAB_META[tab].note}</div>
          </div>
          <span className="desk-chip mono">{visibleItems.length}</span>
        </div>

        <div className="flex-1 overflow-y-auto p-2">
          <div className="space-y-1.5">
            {visibleItems.map((item) => {
              const isActive = symbol === item;

              return (
                <button
                  key={item}
                  type="button"
                  className={`interactive-row flex w-full items-center justify-between gap-3 text-left ${
                    isActive ? "border-[rgba(134,248,111,0.24)] bg-[rgba(134,248,111,0.08)]" : ""
                  }`}
                  onClick={() => {
                    onSelect(item);
                    onAnalyze(item);
                  }}
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <div className="text-sm font-semibold text-white">{item}</div>
                      <span
                        className={`h-2 w-2 rounded-full ${
                          isActive ? "bg-[var(--accent)]" : "bg-white/20"
                        }`}
                      />
                    </div>
                    <div className="mt-1 text-[11px] uppercase tracking-[0.18em] text-[var(--text-dim)]">
                      {tickerCategory(item)}
                    </div>
                  </div>

                  <div className="text-right">
                    <div className="text-xs font-medium text-white">{isActive ? "Live" : "Open"}</div>
                    <div className="mt-1 text-[11px] uppercase tracking-[0.18em] text-[var(--text-soft)]">
                      {horizon === "short_term" ? "ST" : "LT"}
                    </div>
                  </div>
                </button>
              );
            })}

            {!visibleItems.length ? (
              <div className="interactive-row text-sm text-slate-300">
                No symbols match the current filter.
              </div>
            ) : null}
          </div>
        </div>
      </section>
    </aside>
  );
}
