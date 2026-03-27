"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import BrandLockup from "@/components/BrandLockup";
import { restoreSession, type AuthSession } from "@/lib/auth";

const HERO_QUOTES = [
  "SPY 645.09  0.00%",
  "QQQ 558.74  +0.32%",
  "NVDA 1014.63  +1.18%",
  "MSFT 492.11  -0.14%",
  "AAPL 233.44  +0.27%",
  "META 678.09  +0.61%",
  "TSLA 292.18  -0.71%",
  "AMD 188.45  +0.94%",
];

const SIGNAL_LOOP = [
  {
    label: "Read",
    title: "One market read across price, catalysts, and regime.",
    copy:
      "The active symbol is interpreted with technical structure, benchmark drift, sector context, and catalyst flow in the same operating pass.",
  },
  {
    label: "Rank",
    title: "New capital gets an order instead of a pile of scores.",
    copy:
      "Candidates are sorted against each other at the portfolio layer so buy pressure, review pressure, and replacement logic all live in one queue.",
  },
  {
    label: "Act",
    title: "Research can move directly into execution prep.",
    copy:
      "Workspaces keep watchlists, alerts, memos, benchmark-aware portfolio reports, and broker previews tied to the same desk state.",
  },
];

const SURFACES = [
  {
    label: "Arena",
    copy: "Chart-first review for the active symbol, live structure, and the immediate execution path.",
  },
  {
    label: "Research",
    copy: "Ticker catalysts, macro drivers, plain-English reads, confirmation, and invalidation in one place.",
  },
  {
    label: "Operator",
    copy: "Workspace memory, ranked queues, portfolio notes, and execution previews without leaving the desk.",
  },
];

export default function HomePage() {
  const [session, setSession] = useState<AuthSession | null>(null);
  const [authReady, setAuthReady] = useState(false);

  useEffect(() => {
    let active = true;

    restoreSession()
      .then((nextSession) => {
        if (!active) return;
        setSession(nextSession);
        setAuthReady(true);
      })
      .catch(() => {
        if (!active) return;
        setSession(null);
        setAuthReady(true);
      });

    return () => {
      active = false;
    };
  }, []);

  const primaryHref = authReady && session ? "/workspace" : "/register";
  const primaryLabel = authReady && session ? "Open Desk" : "Request Access";

  return (
    <main className="app-shell min-h-screen">
      <section className="marketing-viewport safe-shell relative">
        <div className="product-plane">
          <div className="absolute inset-y-[10%] right-[4%] left-[42%] hidden lg:block">
            <div className="drift-slow absolute inset-0">
              <div className="absolute top-0 right-0 left-0 h-[54px] border-y border-white/10 bg-black/20" />
              <div className="absolute top-[76px] left-0 right-[18%] bottom-[18%] border border-white/10 bg-black/12" />
              <div className="absolute top-[76px] right-0 w-[15%] bottom-[18%] border border-white/10 bg-black/10" />
              <div className="absolute left-0 right-0 bottom-0 h-[13%] border-y border-white/10 bg-black/18" />

              {[16, 24, 20, 32, 28, 44, 38, 52, 48, 60, 56, 64].map((value, index) => (
                <div
                  key={`hero-bar-${value}-${index}`}
                  className="absolute bottom-[24%] w-[1.2%] bg-[rgba(154,246,207,0.7)]"
                  style={{
                    left: `${10 + index * 5.4}%`,
                    height: `${value}%`,
                    opacity: index % 3 === 0 ? 0.35 : 0.85,
                  }}
                />
              ))}

              {[12, 18, 10, 22, 16, 14, 24, 18, 28, 20, 26, 24].map((value, index) => (
                <div
                  key={`hero-line-${value}-${index}`}
                  className="absolute top-[18%] h-px bg-[rgba(210,224,242,0.15)]"
                  style={{
                    left: `${6 + index * 6.8}%`,
                    width: `${8 + value}%`,
                    transform: `translateY(${index * 32}px)`,
                  }}
                />
              ))}
            </div>
          </div>

          <div className="market-marquee">
            <div className="marquee-track">
              {[...HERO_QUOTES, ...HERO_QUOTES].map((item, index) => (
                <div key={`${item}-${index}`} className="quote-chip mono">
                  {item}
                </div>
              ))}
            </div>
          </div>
        </div>

        <header className="relative z-20">
          <div className="flex items-start justify-between gap-4">
            <BrandLockup />
            <div className="flex flex-wrap items-center gap-3">
              <Link href="/login" prefetch={false} className="action-button-secondary">
                Sign In
              </Link>
              <Link href={primaryHref} prefetch={false} className="action-button">
                {primaryLabel}
              </Link>
            </div>
          </div>
        </header>

        <div className="relative z-20 flex min-h-[calc(100svh-120px)] items-end pb-16 pt-16 sm:pb-20 lg:pb-24">
          <div className="max-w-[720px]">
            <div className="poster-text text-[clamp(4.5rem,13vw,10rem)] font-semibold text-white">
              Unveni
            </div>
            <h1 className="mt-4 max-w-[11ch] text-[clamp(2rem,5vw,4.4rem)] font-semibold leading-[0.96] tracking-[-0.07em] text-white">
              Research and execution on one market operating surface.
            </h1>
            <p className="mt-6 max-w-[620px] text-base leading-8 text-[var(--text-soft)] sm:text-lg">
              Multivariate reads, ranked portfolio queues, persistent workspace memory, and broker-ready execution context without breaking the trading loop.
            </p>

            <div className="mt-8 flex flex-wrap gap-3">
              <Link href={primaryHref} prefetch={false} className="action-button">
                {primaryLabel}
              </Link>
              <Link href="/login" prefetch={false} className="action-button-secondary">
                Enter Existing Desk
              </Link>
            </div>
          </div>
        </div>
      </section>

      <section className="safe-shell bg-[linear-gradient(180deg,#0f151d_0%,#0a0f15_100%)]">
        <div className="mx-auto max-w-[1480px] py-16 sm:py-20 lg:py-24">
          <div className="max-w-[820px]">
            <div className="eyebrow">Signal Loop</div>
            <h2 className="mt-4 text-[clamp(2.2rem,4.6vw,4rem)] font-semibold tracking-[-0.06em] text-white">
              One market loop from read to ranked action.
            </h2>
            <p className="mt-5 max-w-[640px] text-base leading-8 text-[var(--text-soft)]">
              Public copy should explain the operating loop, not decorate it. The platform exists to read the market, sort the book, and move the desk closer to action.
            </p>
          </div>

          <div className="mt-12">
            {SIGNAL_LOOP.map((item) => (
              <div key={item.label} className="section-rule grid gap-4 py-6 lg:grid-cols-[180px_minmax(0,1fr)]">
                <div className="mono text-xs uppercase tracking-[0.22em] text-[var(--text-dim)]">
                  {item.label}
                </div>
                <div>
                  <div className="text-2xl font-semibold tracking-[-0.04em] text-white">
                    {item.title}
                  </div>
                  <div className="mt-3 max-w-[720px] text-sm leading-8 text-[var(--text-soft)]">
                    {item.copy}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="safe-shell bg-[#07090d]">
        <div className="mx-auto max-w-[1480px] py-16 sm:py-20 lg:py-24">
          <div className="grid gap-10 lg:grid-cols-[0.95fr_1.05fr] lg:items-start">
            <div>
              <div className="eyebrow">Inside The Product</div>
              <h2 className="mt-4 text-[clamp(2.2rem,4.4vw,4rem)] font-semibold tracking-[-0.06em] text-white">
                Three surfaces. One memory.
              </h2>
              <p className="mt-5 max-w-[560px] text-base leading-8 text-[var(--text-soft)]">
                The chart arena stays primary, the research surface stays contextual, and the operator layer manages queue logic and execution without taking over the desk.
              </p>
            </div>

            <div className="border-t border-white/10">
              {SURFACES.map((item) => (
                <div
                  key={item.label}
                  className="grid gap-4 border-b border-white/10 py-6 lg:grid-cols-[180px_minmax(0,1fr)]"
                >
                  <div className="text-xl font-semibold tracking-[-0.04em] text-white">
                    {item.label}
                  </div>
                  <div className="text-sm leading-8 text-[var(--text-soft)]">{item.copy}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="safe-shell bg-[linear-gradient(180deg,#0f151d_0%,#071018_100%)]">
        <div className="mx-auto max-w-[1480px] py-16 sm:py-20 lg:py-24">
          <div className="max-w-[820px]">
            <div className="eyebrow">Open The Desk</div>
            <h2 className="mt-4 text-[clamp(2.2rem,4.4vw,4rem)] font-semibold tracking-[-0.06em] text-white">
              Start with the current workspace, not a marketing demo.
            </h2>
            <p className="mt-5 max-w-[620px] text-base leading-8 text-[var(--text-soft)]">
              The best proof is the product itself. Open the desk, move through the live read, and stress the queue, memo, and execution flow directly.
            </p>
          </div>

          <div className="mt-8 flex flex-wrap gap-3">
            <Link href={primaryHref} prefetch={false} className="action-button">
              {primaryLabel}
            </Link>
            <Link href="/login" prefetch={false} className="action-button-secondary">
              Sign In
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}
