"use client";

import Image from "next/image";
import Link from "next/link";
import { brand } from "@/lib/brand";

type Props = {
  compact?: boolean;
};

export default function BrandLockup({ compact = false }: Props) {
  return (
    <Link href="/" className="flex min-w-0 shrink-0 flex-col items-center gap-1 pr-2 text-center">
      <div
        className={`font-medium uppercase tracking-[0.28em] text-[var(--text-dim)] ${
          compact ? "text-[9px] sm:text-[10px]" : "text-[10px] sm:text-[11px]"
        }`}
      >
        {brand.appEyebrow}
      </div>
      <Image
        src="/unveni-logo.svg"
        alt={`${brand.name} logo`}
        width={compact ? 210 : 284}
        height={compact ? 62 : 86}
        className={`block h-auto max-w-full object-contain ${
          compact ? "h-[30px] sm:h-[34px]" : "h-[34px] sm:h-[40px] lg:h-[44px]"
        }`}
        unoptimized
        priority
      />
    </Link>
  );
}
