"use client";

import Link from "next/link";
import { brand } from "@/lib/brand";

type Props = {
  compact?: boolean;
};

export default function BrandLockup({ compact = false }: Props) {
  return (
    <Link href="/" className="flex min-w-0 shrink-0 flex-col gap-1.5 text-left">
      <span
        className={`mono uppercase tracking-[0.28em] text-[var(--text-dim)] ${
          compact ? "text-[9px]" : "text-[10px] sm:text-[11px]"
        }`}
      >
        {brand.descriptor}
      </span>

      <div
        className={`font-semibold tracking-[-0.09em] text-white ${
          compact ? "text-[1.5rem] leading-none" : "text-[2rem] leading-none sm:text-[2.35rem]"
        }`}
      >
        {brand.name}
      </div>

      <div
        className={`flex items-center gap-2 mono uppercase tracking-[0.22em] text-[var(--text-soft)] ${
          compact ? "text-[8px]" : "text-[10px]"
        }`}
      >
        <span className="status-dot" />
        {brand.appEyebrow}
      </div>
    </Link>
  );
}
