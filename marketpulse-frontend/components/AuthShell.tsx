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

const ACCESS_NOTES = [
  "Separate short-term and long-term reads stay attached to the same account.",
  "Catalyst review, confirmation, invalidation, and memo history stay linked.",
  "Portfolio ranking and execution preview remain part of the desk, not a separate tool.",
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
    <main className="app-shell marketing-viewport safe-shell min-h-screen">
      <div className="product-plane">
        <div className="absolute inset-y-[12%] right-[4%] left-[48%] hidden lg:block">
          <div className="drift-slow absolute inset-0 border border-white/10 bg-black/10" />
        </div>
      </div>

      <div className="relative z-20 flex min-h-[calc(100svh-32px)] flex-col">
        <header className="flex items-start justify-between gap-4">
          <BrandLockup />
          <Link href={altHref} className="action-button-secondary">
            {altLabel}
          </Link>
        </header>

        <div className="grid flex-1 gap-10 py-10 lg:grid-cols-[0.95fr_0.75fr] lg:items-end lg:py-14">
          <div className="max-w-[680px]">
            <div className="poster-text text-[clamp(4rem,12vw,8rem)] font-semibold text-white">
              Unveni
            </div>
            <div className="mt-8 eyebrow">{eyebrow}</div>
            <h1 className="mt-4 max-w-[11ch] text-[clamp(2rem,4.8vw,4rem)] font-semibold leading-[0.97] tracking-[-0.07em] text-white">
              {title}
            </h1>
            <p className="mt-5 max-w-[560px] text-base leading-8 text-[var(--text-soft)]">
              {subtitle}
            </p>

            <div className="mt-10 border-t border-white/10">
              {ACCESS_NOTES.map((item) => (
                <div key={item} className="section-rule text-sm leading-8 text-[var(--text-soft)]">
                  {item}
                </div>
              ))}
            </div>
          </div>

          <div className="w-full max-w-[520px] lg:justify-self-end">
            <div className="frame-shell px-5 py-5 sm:px-6 sm:py-6">
              {children}

              <div className="section-rule mt-6 text-sm text-[var(--text-soft)]">
                {altPrompt}{" "}
                <Link href={altHref} className="text-[var(--accent)] underline underline-offset-4">
                  {altLabel}
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
