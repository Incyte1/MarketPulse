"use client";

import { startTransition, useDeferredValue, useState } from "react";
import { useRouter } from "next/navigation";
import { Input } from "@/components/ui/Input";
import { symbols } from "@/lib/mock-unveni";
import { formatSignedPercent } from "@/lib/utils";

export default function WorkspaceCommand() {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const deferredQuery = useDeferredValue(query);
  const normalized = deferredQuery.trim().toUpperCase();

  const matches =
    normalized.length === 0
      ? symbols.slice(0, 4)
      : symbols.filter((item) => {
          const haystack = `${item.symbol} ${item.name}`.toUpperCase();
          return haystack.includes(normalized);
        });

  function openSymbol(symbol: string) {
    startTransition(() => {
      router.push(`/workspace/symbol/${symbol.toLowerCase()}`);
    });
    setQuery("");
  }

  return (
    <div className="workspace-command">
      <Input
        aria-label="Open a symbol"
        placeholder="Jump to coverage"
        value={query}
        onChange={(event) => setQuery(event.target.value)}
        onKeyDown={(event) => {
          if (event.key === "Enter" && matches[0]) {
            event.preventDefault();
            openSymbol(matches[0].symbol);
          }
        }}
      />

      <div className="workspace-command-results">
        {matches.map((item) => (
          <button
            key={item.symbol}
            type="button"
            className="workspace-command-result"
            onClick={() => openSymbol(item.symbol)}
          >
            <div>
              <div className="text-sm font-semibold text-[color:var(--text-strong)]">
                {item.symbol}
              </div>
              <div className="mt-1 text-xs text-[color:var(--text-soft)]">{item.name}</div>
            </div>

            <div className="text-right">
              <div className="text-sm font-medium text-[color:var(--text-strong)]">
                {item.price.toFixed(2)}
              </div>
              <div
                className={`mt-1 text-xs ${
                  item.changePercent >= 0 ? "signal-positive" : "signal-negative"
                }`}
              >
                {formatSignedPercent(item.changePercent)}
              </div>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}
