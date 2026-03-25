"use client";

import { useMemo, useState } from "react";

type Props = {
  symbol: string;
  onSelect: (ticker: string) => void;
  onAnalyze: (ticker: string) => void;
};

type SidebarTab = "favorites" | "hot" | "trending" | "etfs" | "tech";

const TAB_ITEMS: Record<SidebarTab, string[]> = {
  favorites: ["SPY", "QQQ", "AAPL", "NVDA", "TSLA"],
  hot: ["NVDA", "SMCI", "AMD", "PLTR", "AVGO"],
  trending: ["TSLA", "META", "AMZN", "NFLX", "GOOGL"],
  etfs: ["SPY", "QQQ", "IWM", "DIA"],
  tech: ["AAPL", "MSFT", "NVDA", "AMD", "META", "GOOGL"],
};

export default function TickerSidebar({ symbol, onSelect, onAnalyze }: Props) {
  const [query, setQuery] = useState("");
  const [tab, setTab] = useState<SidebarTab>("favorites");

  const visibleItems = useMemo(() => {
    const items = TAB_ITEMS[tab];
    const q = query.trim().toUpperCase();

    if (!q) return items;
    return items.filter((item) => item.includes(q));
  }, [tab, query]);

  return (
    <aside className="w-[280px] border-r border-white/10 bg-[#050913] p-4">
      <div>
        <div className="text-2xl font-bold">MarketPulse</div>
        <div className="mt-1 text-sm text-slate-400">Clarity before every trade.</div>
      </div>

      <div className="mt-6">
        <div className="text-sm font-medium text-slate-300">Search ticker</div>
        <div className="mt-2 flex gap-2">
          <input
            className="w-full rounded-xl border border-white/10 bg-[#0b1323] px-3 py-2 text-sm outline-none placeholder:text-slate-500"
            value={query}
            onChange={(e) => setQuery(e.target.value.toUpperCase())}
            placeholder="SPY"
          />
          <button
            className="rounded-xl bg-white px-4 py-2 text-sm font-medium text-black"
            onClick={() => {
              const value = query.trim().toUpperCase();
              if (!value) return;
              onSelect(value);
              onAnalyze(value);
            }}
          >
            Go
          </button>
        </div>
      </div>

      <div className="mt-6 grid grid-cols-2 gap-2">
        <button
          className={`rounded-xl px-3 py-2 text-sm ${tab === "favorites" ? "bg-emerald-500 text-black" : "bg-[#0b1323] text-slate-300"}`}
          onClick={() => setTab("favorites")}
        >
          Favorites
        </button>
        <button
          className={`rounded-xl px-3 py-2 text-sm ${tab === "hot" ? "bg-emerald-500 text-black" : "bg-[#0b1323] text-slate-300"}`}
          onClick={() => setTab("hot")}
        >
          Hot
        </button>
        <button
          className={`rounded-xl px-3 py-2 text-sm ${tab === "trending" ? "bg-emerald-500 text-black" : "bg-[#0b1323] text-slate-300"}`}
          onClick={() => setTab("trending")}
        >
          Trending
        </button>
        <button
          className={`rounded-xl px-3 py-2 text-sm ${tab === "etfs" ? "bg-emerald-500 text-black" : "bg-[#0b1323] text-slate-300"}`}
          onClick={() => setTab("etfs")}
        >
          ETFs
        </button>
        <button
          className={`col-span-2 rounded-xl px-3 py-2 text-sm ${tab === "tech" ? "bg-emerald-500 text-black" : "bg-[#0b1323] text-slate-300"}`}
          onClick={() => setTab("tech")}
        >
          Tech
        </button>
      </div>

      <div className="mt-6">
        <div className="text-sm font-medium text-slate-300">
          {tab === "favorites" && "Favorites"}
          {tab === "hot" && "Hot names"}
          {tab === "trending" && "Trending"}
          {tab === "etfs" && "ETFs"}
          {tab === "tech" && "Tech"}
        </div>

        <div className="mt-3 space-y-2">
          {visibleItems.map((item) => (
            <button
              key={item}
              className={`flex w-full items-center justify-between rounded-xl border px-3 py-3 text-left text-sm transition ${
                symbol === item
                  ? "border-emerald-500/30 bg-emerald-500/10 text-white"
                  : "border-white/10 bg-[#0b1323] text-slate-300 hover:border-white/20"
              }`}
              onClick={() => {
                onSelect(item);
                onAnalyze(item);
              }}
            >
              <span>{item}</span>
              <span className="text-xs text-slate-500">Open</span>
            </button>
          ))}
        </div>
      </div>
    </aside>
  );
}