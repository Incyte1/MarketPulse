"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import BrandLockup from "@/components/BrandLockup";
import { restoreSession, type AuthSession } from "@/lib/auth";

const HERO_PANELS = [
  {
    eyebrow: "Multi-horizon engines",
    title: "Independent short-term and long-term reads.",
    copy:
      "Separate data windows, separate support and resistance logic, and separate decision framing keep execution and thesis work from bleeding into each other.",
  },
  {
    eyebrow: "Research review",
    title: "Catalysts ranked for action, not content browsing.",
    copy:
      "Ticker-specific drivers, macro context, confirmation, invalidation, and plain-language summaries are organized for fast analyst review.",
  },
  {
    eyebrow: "Workspace memory",
    title: "Saved desks, watchlists, and memo continuity.",
    copy:
      "Teams return to the same symbol context, open questions, and research stack instead of rebuilding the session every morning.",
  },
];

const PLATFORM_METRICS = [
  { label: "Short-term", value: "1D / 1H" },
  { label: "Long-term", value: "1W / 1D" },
  { label: "Charting", value: "TradingView" },
];

const RESEARCH_PILLARS = [
  {
    title: "Chart-first review",
    copy:
      "Run the market structure, levels, and execution framing from the same surface where the markup actually happens.",
  },
  {
    title: "Catalyst triage",
    copy:
      "Separate ticker and macro context so analysts can isolate what matters now versus what is merely noisy background flow.",
  },
  {
    title: "Thesis discipline",
    copy:
      "Confirmation, invalidation, and memo context stay attached to the symbol so the system supports review instead of replacing it.",
  },
];

const TEAM_USE_CASES = [
  {
    title: "Analysts",
    copy: "Condense the first pass of catalyst review, technical structure, and note prep into one workspace.",
  },
  {
    title: "Portfolio managers",
    copy: "Review active names faster with a consistent short-term and long-term framing across the coverage universe.",
  },
  {
    title: "Trading desks",
    copy: "Use one chart-led surface for execution context, level tracking, and linked research handoff.",
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

  return (
    <main className="app-shell min-h-screen px-3 py-3 lg:px-4 lg:py-4">
      <div className="mx-auto max-w-[1680px] space-y-3 md:space-y-4">
        <header className="command-shell reveal-up sticky top-3 z-30 overflow-hidden px-4 py-4 lg:px-5">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex min-w-0 flex-col gap-3">
              <BrandLockup />
            </div>

            <div className="flex flex-wrap items-center gap-3 sm:justify-start lg:justify-end">
              {authReady && session ? (
                <Link href="/workspace" className="action-button">
                  Open Workspace
                </Link>
              ) : (
                <>
                  <Link href="/login" className="action-button-secondary">
                    Login
                  </Link>
                  <Link href="/register" className="action-button">
                    Create Account
                  </Link>
                </>
              )}
            </div>
          </div>
        </header>

        <section
          id="overview"
          className="frame-shell reveal-up reveal-delay-1 overflow-hidden px-5 py-7 sm:px-6 sm:py-8 lg:px-8 lg:py-10"
        >
          <div className="grid gap-8 xl:grid-cols-[1.02fr_0.98fr] xl:items-end">
            <div>
              <div className="eyebrow">Research Platform</div>
              <h1 className="mt-4 max-w-[760px] text-[2.15rem] font-semibold leading-[0.96] tracking-[-0.07em] text-white sm:text-[2.8rem] md:text-[3.3rem] lg:text-[4.7rem] xl:text-[5.3rem]">
                Institutional market review without the terminal bloat.
              </h1>
              <p className="mt-5 max-w-[720px] text-base leading-8 text-[var(--text-soft)] lg:text-lg">
                Unveni gives research teams a chart-led workspace for multi-horizon technical review,
                catalyst triage, and memo-ready context. The public site introduces the product; the
                live workspace opens only after sign-in.
              </p>

              <div className="mt-6 flex flex-wrap gap-3">
                <Link href={session ? "/workspace" : "/register"} className="action-button">
                  {session ? "Go To Workspace" : "Request Access"}
                </Link>
                <Link href="/login" className="action-button-secondary">
                  Sign In
                </Link>
              </div>
            </div>

            <div className="sub-surface px-4 py-4 sm:px-5 sm:py-5 lg:px-6 lg:py-6">
              <div className="eyebrow">Platform Snapshot</div>
              <div className="mt-4 grid gap-3">
                {HERO_PANELS.map((panel) => (
                  <div key={panel.title} className="sub-surface px-4 py-4 sm:px-5">
                    <div className="field-label">{panel.eyebrow}</div>
                    <div className="mt-2 text-lg font-semibold text-white sm:text-xl">{panel.title}</div>
                    <div className="mt-2 text-sm leading-7 text-[var(--text-soft)]">{panel.copy}</div>
                  </div>
                ))}
              </div>

              <div className="mt-5 grid gap-2 sm:grid-cols-3">
                {PLATFORM_METRICS.map((item) => (
                  <div key={item.label} className="sub-surface px-4 py-4">
                    <div className="field-label">{item.label}</div>
                    <div className="mt-2 text-xl font-semibold text-white">{item.value}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        <section id="research" className="grid gap-3 xl:grid-cols-[minmax(0,1.08fr)_0.92fr]">
          <div className="frame-shell reveal-up reveal-delay-2 px-5 py-6 lg:px-6">
            <div className="eyebrow">Research Flow</div>
            <div className="mt-3 text-3xl font-semibold text-white">
              Built for real review flow, not passive dashboard consumption.
            </div>
            <div className="mt-4 text-sm leading-7 text-[var(--text-soft)]">
              The platform is designed to help analysts move from chart structure to catalyst review
              to note framing without bouncing across disconnected tools.
            </div>

            <div className="mt-5 grid gap-2 lg:grid-cols-3">
              {RESEARCH_PILLARS.map((pillar) => (
                <div key={pillar.title} className="sub-surface px-4 py-4">
                  <div className="field-label">{pillar.title}</div>
                  <div className="mt-2 text-sm leading-7 text-slate-200">{pillar.copy}</div>
                </div>
              ))}
            </div>
          </div>

          <div className="frame-shell reveal-up reveal-delay-3 px-5 py-6 lg:px-6">
            <div className="eyebrow">Workspace Access</div>
            <div className="mt-3 text-3xl font-semibold text-white">A private workspace with a public-facing product site.</div>
            <div className="mt-4 text-sm leading-7 text-[var(--text-soft)]">
              Public visitors land on the Unveni product homepage. Authorized users enter a private
              workspace where desks, watchlists, and research state persist across sessions.
            </div>

            <div className="mt-5 space-y-2">
              <div className="sub-surface px-4 py-4">
                <div className="field-label">Private Access</div>
                <div className="mt-2 text-sm leading-7 text-slate-200">
                  The workspace stays account-based so coverage, saved context, and ongoing review flow remain tied to the team using it.
                </div>
              </div>
              <div className="sub-surface px-4 py-4">
                <div className="field-label">Persistent State</div>
                <div className="mt-2 text-sm leading-7 text-slate-200">
                  Saved desks, watchlists, alerts, and memo context are designed to survive past the first session.
                </div>
              </div>
              <div className="sub-surface px-4 py-4">
                <div className="field-label">Team Readiness</div>
                <div className="mt-2 text-sm leading-7 text-slate-200">
                  The public site can stay clean and brand-forward while the actual review surface remains private.
                </div>
              </div>
            </div>
          </div>
        </section>

        <section id="teams" className="frame-shell reveal-up reveal-delay-3 px-5 py-6 lg:px-6">
          <div className="grid gap-5 xl:grid-cols-[0.9fr_1.1fr] xl:items-start">
            <div>
              <div className="eyebrow">Who It Serves</div>
              <div className="mt-3 text-3xl font-semibold text-white">
                Unveni is meant to compress the first hour of market review.
              </div>
              <div className="mt-4 text-sm leading-7 text-[var(--text-soft)]">
                The product is structured for firms that want faster analytical review without giving up chart work, catalyst context, or decision discipline.
              </div>
            </div>

            <div className="grid gap-2 sm:grid-cols-3">
              {TEAM_USE_CASES.map((useCase) => (
                <div key={useCase.title} className="sub-surface px-4 py-4">
                  <div className="field-label">{useCase.title}</div>
                  <div className="mt-2 text-sm leading-7 text-slate-200">{useCase.copy}</div>
                </div>
              ))}
            </div>
          </div>

          <div className="mt-5 flex flex-wrap items-center justify-between gap-3 rounded-[20px] border border-white/8 bg-white/[0.025] px-4 py-4 sm:px-5">
            <div>
              <div className="text-lg font-semibold text-white">Request access to the private workspace.</div>
              <div className="mt-1 text-sm leading-7 text-[var(--text-soft)]">
                Use the public site for product framing, then sign in to open the live research surface.
              </div>
            </div>
            <div className="flex flex-wrap gap-3">
              <Link href={session ? "/workspace" : "/register"} className="action-button">
                {session ? "Open Workspace" : "Create Account"}
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
