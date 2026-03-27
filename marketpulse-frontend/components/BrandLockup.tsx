"use client";

import Link from "next/link";
import { brand } from "@/lib/brand";

type Props = {
  compact?: boolean;
};

export default function BrandLockup({ compact = false }: Props) {
  return (
    <Link href="/" className="flex min-w-0 shrink-0 flex-col gap-1.5 text-left">
      <div className="flex items-center gap-2">
        <span className="status-dot" />
        <span
          className={`mono uppercase tracking-[0.24em] text-[var(--text-dim)] ${
            compact ? "text-[9px]" : "text-[10px] sm:text-[11px]"
          }`}
        >
          {brand.descriptor}
        </span>
      </div>

      <div
        className={`font-semibold uppercase tracking-[-0.09em] text-white ${
          compact ? "text-[1.35rem] leading-none" : "text-[1.7rem] leading-none sm:text-[2rem]"
        }`}
      >
        {brand.name}
      </div>

      <div
        className={`mono uppercase tracking-[0.22em] text-[var(--text-soft)] ${
          compact ? "text-[8px]" : "text-[10px]"
        }`}
      >
        {brand.appEyebrow}
      </div>
    </Link>
  );
}
