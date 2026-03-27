"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import BrandLockup from "@/components/BrandLockup";
import { restoreSession, type AuthSession } from "@/lib/auth";

const SIGNAL_LAYERS = [
  {
    label: "Signal Layer",
    title: "Multivariate inputs instead of one-note chart calls.",
    copy:
      "Price, volume, regime, relative strength, benchmark drift, sector context, and catalyst flow sit in the same read before anything is promoted.",
  },
  {
    label: "Rank Layer",
    title: "The book is sorted at the portfolio level.",
    copy:
      "Candidates are ranked against each other, not scored in isolation, so new capital has an order and weaker names can be rotated out cleanly.",
  },
  {
    label: "Execution Layer",
    title: "Research turns into an action-ready queue.",
    copy:
      "The workspace now produces target weights, benchmark comparison, daily summary language, and broker-ready previews instead of dead-end notes.",
  },
];

const WORKFLOW_STEPS = [
  "Read the active symbol with separate short-term and long-term engines.",
  "Promote names into a shared watchlist and persistent workspace.",
  "Rank the current universe into buy, review, and exit queues.",
  "Prepare execution with benchmark-aware portfolio and broker preview.",
];

const SURFACE_POINTS = [
  {
    label: "Desk",
    copy: "Chart-first review for the active symbol, current levels, and regime.",
  },
  {
    label: "Research",
    copy: "Ticker catalysts, macro drivers, confirmation, invalidation, and plain-English readouts.",
  },
  {
    label: "Memory",
    copy: "Watchlists, alerts, memos, portfolio queue, and execution preview tied to one workspace.",
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
  const primaryLabel = authReady && session ? "Open Workspace" : "Request Access";

  return (
    <main className="app-shell min-h-screen px-3 py-3 sm:px-4 sm:py-4 lg:px-6 lg:py-6">
      <div className="mx-auto max-w-[1680px] space-y-4">
        <header className="command-shell reveal-up sticky top-3 z-30 px-4 py-4 sm:px-5 lg:px-6">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex min-w-0 items-center justify-between gap-4">
              <BrandLockup />
              <div className="hidden items-center gap-3 lg:flex">
                <span className="desk-chip desk-chip-accent mono">
                  <span className="status-dot" />
                  Live Research Product
                </span>
                <span className="desk-chip mono">Short horizon + portfolio engine</span>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <Link href="/login" className="action-button-secondary">
                Sign In
              </Link>
              <Link href={primaryHref} className="action-button">
                {primaryLabel}
              </Link>
            </div>
          </div>
        </header>

        <section className="market-plane reveal-up reveal-delay-1 relative -mx-3 overflow-hidden border-y border-[var(--line)] px-3 py-8 sm:-mx-4 sm:px-4 lg:-mx-6 lg:px-6 lg:py-10">
          <div className="hero-orbit hidden xl:block" />

          <div className="mx-auto grid max-w-[1680px] gap-8 xl:grid-cols-[minmax(0,0.95fr)_minmax(440px,0.85fr)] xl:items-end">
            <div className="relative z-10 max-w-[760px]">
              <div className="desk-chip desk-chip-info mono">Trading workspace rework in motion</div>
              <h1 className="poster-text mt-6 max-w-[820px] text-[3rem] font-semibold text-white sm:text-[4.4rem] lg:text-[6.2rem]">
                A sharper trading desk, not a soft dashboard.
              </h1>
              <p className="mt-6 max-w-[650px] text-base leading-8 text-[var(--text-soft)] sm:text-lg">
                Unveni is moving toward a tighter market-product feel: stronger chart hierarchy,
                cleaner signal ranking, portfolio-aware review, and execution context that feels
                closer to a real trading platform than a styled research app.
              </p>

              <div className="mt-8 flex flex-wrap gap-3">
                <Link href={primaryHref} className="action-button">
                  {primaryLabel}
                </Link>
                <Link href="/login" className="action-button-secondary">
                  Enter Existing Desk
                </Link>
              </div>

              <div className="mt-8 flex flex-wrap gap-2">
                <span className="desk-chip mono">Short-term / long-term engines</span>
                <span className="desk-chip mono">Portfolio rank engine</span>
                <span className="desk-chip mono">Daily summary + execution preview</span>
              </div>
            </div>

            <div className="relative z-10 grid gap-3">
              <div className="ticker-lane">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <div className="eyebrow">Market Stack</div>
                    <div className="mt-2 text-xl font-semibold text-white">Multivariate signal system</div>
                  </div>
                  <span className="desk-chip desk-chip-accent mono">Live</span>
                </div>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <div className="metric-cell">
                  <div className="eyebrow">Research Inputs</div>
                  <div className="mt-3 text-3xl font-semibold text-white">Price + Volume</div>
                  <div className="mt-2 text-sm leading-7 text-[var(--text-soft)]">
                    Relative strength, market tone, and sector context are all pushed into the
                    same read.
                  </div>
                </div>

                <div className="metric-cell">
                  <div className="eyebrow">Book Logic</div>
                  <div className="mt-3 text-3xl font-semibold text-white">Ranked Queue</div>
                  <div className="mt-2 text-sm leading-7 text-[var(--text-soft)]">
                    Buy, review, and exit candidates are sorted against each other at the
                    portfolio layer.
                  </div>
                </div>
              </div>

              <div className="space-y-3">
                <div className="ticker-lane flex items-center justify-between gap-3">
                  <div>
                    <div className="eyebrow">Portfolio</div>
                    <div className="mt-1 text-sm text-white">Target weights, benchmark spread, daily brief</div>
                  </div>
                  <div className="text-right text-sm">
                    <div className="signal-positive font-semibold">MODEL + EXECUTION</div>
                    <div className="text-[var(--text-dim)]">Report + broker preview</div>
                  </div>
                </div>

                <div className="ticker-lane flex items-center justify-between gap-3">
                  <div>
                    <div className="eyebrow">Workspace</div>
                    <div className="mt-1 text-sm text-white">Watchlists, alerts, memo memory, symbol sync</div>
                  </div>
                  <div className="text-right text-sm">
                    <div className="text-white font-semibold">PERSISTENT</div>
                    <div className="text-[var(--text-dim)]">Desk continuity</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="grid gap-4 xl:grid-cols-[1.05fr_0.95fr]">
          <div className="frame-shell reveal-up reveal-delay-2 px-5 py-6 sm:px-6 lg:px-8 lg:py-8">
            <div className="eyebrow">Architecture</div>
            <div className="mt-3 max-w-[720px] text-3xl font-semibold text-white sm:text-4xl">
              Three layers that push the product closer to a real trading platform.
            </div>

            <div className="mt-6 grid gap-3">
              {SIGNAL_LAYERS.map((item) => (
                <div key={item.title} className="interactive-row">
                  <div className="eyebrow">{item.label}</div>
                  <div className="mt-2 text-lg font-semibold text-white">{item.title}</div>
                  <div className="mt-2 max-w-[620px] text-sm leading-7 text-[var(--text-soft)]">
                    {item.copy}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="frame-shell reveal-up reveal-delay-3 px-5 py-6 sm:px-6 lg:px-8 lg:py-8">
            <div className="eyebrow">Cadence</div>
            <div className="mt-3 text-3xl font-semibold text-white sm:text-4xl">
              The operating rhythm should feel deliberate from first scan to trade prep.
            </div>

            <div className="mt-6 space-y-3">
              {WORKFLOW_STEPS.map((step, index) => (
                <div key={step} className="interactive-row flex items-start gap-4">
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-white/10 bg-white/5 text-sm font-semibold text-white">
                    {String(index + 1).padStart(2, "0")}
                  </div>
                  <div className="pt-1 text-sm leading-7 text-[var(--text-soft)]">{step}</div>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="frame-shell reveal-up reveal-delay-3 px-5 py-6 sm:px-6 lg:px-8 lg:py-8">
          <div className="grid gap-8 xl:grid-cols-[0.95fr_1.05fr] xl:items-start">
            <div>
              <div className="eyebrow">Surface Model</div>
              <div className="mt-3 max-w-[640px] text-3xl font-semibold text-white sm:text-4xl">
                One product, three jobs: read the tape, work the thesis, manage the book.
              </div>
              <div className="mt-4 max-w-[620px] text-sm leading-8 text-[var(--text-soft)]">
                The redesign is moving the app away from generalized panels and toward a clearer
                product hierarchy: the chart is primary, the research feed is contextual, and the
                workspace memory is always available without taking over the screen.
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-3">
              {SURFACE_POINTS.map((item) => (
                <div key={item.label} className="metric-cell">
                  <div className="eyebrow">{item.label}</div>
                  <div className="mt-3 text-base font-semibold text-white">{item.label} Surface</div>
                  <div className="mt-3 text-sm leading-7 text-[var(--text-soft)]">{item.copy}</div>
                </div>
              ))}
            </div>
          </div>

          <div className="mt-8 flex flex-wrap items-center justify-between gap-3 border-t border-white/10 pt-6">
            <div>
              <div className="text-xl font-semibold text-white">Open the new desk and stress the workflow.</div>
              <div className="mt-2 text-sm leading-7 text-[var(--text-soft)]">
                The frontend is staying on Next.js and TypeScript because that is already the right
                web stack for a premium trading UI. If we ever replace a language, it would be for
                backend performance services, not because the frontend stack is weak.
              </div>
            </div>

            <div className="flex flex-wrap gap-3">
              <Link href={primaryHref} className="action-button">
                {primaryLabel}
              </Link>
              <Link href="/login" className="action-button-secondary">
                Sign In
              </Link>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
