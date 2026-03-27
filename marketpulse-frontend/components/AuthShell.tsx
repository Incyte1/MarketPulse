"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import BrandLockup from "@/components/BrandLockup";

type AuthShellProps = {
  eyebrow: string;
  title: string;
  subtitle: string;
  altHref: string;
  altLabel: string;
  altPrompt: string;
  children: ReactNode;
};

const ACCESS_POINTS = [
  "Short-horizon and long-horizon reads stay separate.",
  "Catalyst review, confirmation, invalidation, and memo memory stay linked.",
  "Portfolio ranking and execution preview are part of the desk, not side tools.",
];

const ACCESS_STATUS = [
  { label: "Workspace", value: "Private" },
  { label: "Session", value: "API-backed" },
  { label: "State", value: "Persistent" },
];

export default function AuthShell({
  eyebrow,
  title,
  subtitle,
  altHref,
  altLabel,
  altPrompt,
  children,
}: AuthShellProps) {
  return (
    <main className="app-shell min-h-screen px-3 py-3 sm:px-4 sm:py-4 lg:px-6 lg:py-6">
      <div className="mx-auto flex min-h-[calc(100svh-1.5rem)] max-w-[1440px] items-center">
        <section className="command-shell reveal-up market-plane w-full overflow-hidden p-0">
          <div className="grid min-h-[760px] lg:min-h-[calc(100svh-3rem)] lg:grid-cols-[1.05fr_0.95fr]">
            <div className="relative border-b border-white/10 px-5 py-6 sm:px-6 lg:border-b-0 lg:border-r lg:px-8 xl:px-12 xl:py-10">
              <div className="hero-orbit !inset-auto !right-[-12%] !bottom-[-28%] !h-[460px] !w-[460px] opacity-70" />

              <div className="relative z-10 flex h-full flex-col justify-between">
                <div>
                  <BrandLockup compact />

                  <div className="mt-10 max-w-[520px]">
                    <div className="desk-chip desk-chip-info mono">{eyebrow}</div>
                    <h1 className="mt-5 text-[2.65rem] font-semibold tracking-[-0.07em] text-white sm:text-[3.4rem] lg:text-[4.3rem]">
                      {title}
                    </h1>
                    <p className="mt-5 max-w-[520px] text-sm leading-8 text-[var(--text-soft)] sm:text-base">
                      {subtitle}
                    </p>
                  </div>

                  <div className="mt-8 space-y-3">
                    {ACCESS_POINTS.map((item, index) => (
                      <div key={item} className="interactive-row flex items-start gap-4">
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-white/10 bg-white/5 text-sm font-semibold text-white">
                          {index + 1}
                        </div>
                        <div className="pt-1 text-sm leading-7 text-slate-200">{item}</div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="mt-8 grid gap-3 sm:grid-cols-3">
                  {ACCESS_STATUS.map((item) => (
                    <div key={item.label} className="metric-cell">
                      <div className="eyebrow">{item.label}</div>
                      <div className="mt-3 text-lg font-semibold text-white">{item.value}</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="relative flex items-center justify-center px-5 py-6 sm:px-6 lg:px-8 xl:px-12 xl:py-10">
              <div className="relative z-10 w-full max-w-[520px]">
                <div className="mb-4 flex flex-wrap gap-2">
                  <span className="desk-chip desk-chip-accent mono">Secure Access</span>
                  <span className="desk-chip mono">Account authenticated against API</span>
                </div>

                <div className="frame-shell px-5 py-5 sm:px-6 sm:py-6 lg:px-7 lg:py-7">
                  {children}

                  <div className="mt-6 border-t border-white/10 pt-5 text-sm text-[var(--text-soft)]">
                    {altPrompt}{" "}
                    <Link href={altHref} className="text-[var(--accent)] underline underline-offset-4">
                      {altLabel}
                    </Link>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
