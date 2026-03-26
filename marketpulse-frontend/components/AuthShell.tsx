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

const PLATFORM_POINTS = [
  "Separate short-term and long-term engines",
  "Catalyst ranking with confirmation and invalidation",
  "Saved workspaces, alerts, and memo sync",
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
      <div className="mx-auto flex min-h-[calc(100svh-1.5rem)] max-w-[1260px] items-center">
        <section className="command-shell reveal-up overflow-hidden p-0">
          <div className="grid min-h-[760px] lg:min-h-[calc(100svh-3rem)] lg:grid-cols-[0.98fr_1.02fr]">
            <div className="order-2 relative flex border-t border-white/10 px-5 py-6 sm:px-6 sm:py-7 lg:order-1 lg:border-t-0 lg:border-r lg:px-8 xl:px-10">
              <div className="absolute inset-x-0 top-0 h-48 bg-gradient-to-b from-[rgba(212,90,81,0.12)] via-[rgba(199,121,108,0.08)] to-transparent" />

              <div className="relative mx-auto flex w-full max-w-[520px] flex-col justify-center">
                <div className="flex items-start justify-start">
                  <BrandLockup compact />
                </div>

                <div className="mt-10 max-w-[480px] sm:mt-12">
                  <div className="eyebrow">{eyebrow}</div>
                  <h1 className="mt-3 text-3xl font-semibold tracking-tight text-white sm:text-4xl lg:text-5xl">
                    {title}
                  </h1>
                  <p className="mt-4 max-w-xl text-sm leading-7 text-slate-300 lg:text-base">
                    {subtitle}
                  </p>
                </div>

                <div className="mt-10 grid gap-3">
                  {PLATFORM_POINTS.map((item, index) => (
                    <div key={item} className="interactive-row flex items-center gap-3">
                      <div className="flex h-9 w-9 items-center justify-center rounded-full border border-white/10 bg-white/5 text-sm font-semibold text-white">
                        {index + 1}
                      </div>
                      <div className="text-sm text-slate-200">{item}</div>
                    </div>
                  ))}
                </div>
              </div>

            </div>

            <div className="order-1 flex items-center justify-center px-5 py-6 sm:px-6 sm:py-7 lg:order-2 lg:px-8 xl:px-10">
              <div className="w-full max-w-[500px] rounded-[28px] border border-white/10 bg-black/25 p-5 sm:p-6 lg:p-7">
                <div className="mb-6 flex items-center gap-2">
                  <span className="desk-chip desk-chip-accent mono">Secure access</span>
                  <span className="desk-chip mono">Workspace authentication</span>
                </div>

                {children}

                <div className="mt-6 border-t border-white/10 pt-5 text-sm text-slate-400">
                  {altPrompt}{" "}
                  <Link href={altHref} className="text-[#f1c8c1] underline underline-offset-4">
                    {altLabel}
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
