import Link from "next/link";
import { brand } from "@/lib/brand";
import { cx } from "@/lib/utils";

type Props = {
  compact?: boolean;
  href?: string;
};

export default function BrandLockup({ compact = false, href = "/" }: Props) {
  return (
    <Link
      href={href}
      prefetch={false}
      className={cx("flex min-w-0 shrink-0 flex-col text-left", compact ? "gap-1" : "gap-1.5")}
    >
      <span
        className={cx(
          "mono uppercase tracking-[0.3em] text-[color:var(--text-soft)]",
          compact ? "text-[9px]" : "text-[10px] sm:text-[11px]"
        )}
      >
        {brand.descriptor}
      </span>

      <div
        className={cx(
          "font-semibold tracking-[-0.11em] text-[color:var(--text-strong)]",
          compact ? "text-[1.5rem] leading-none" : "text-[2rem] leading-none sm:text-[2.35rem]"
        )}
      >
        {brand.name}
      </div>

      <div
        className={cx(
          "flex items-center gap-2 mono uppercase tracking-[0.22em] text-[color:var(--text-muted)]",
          compact ? "text-[8px]" : "text-[10px]"
        )}
      >
        <span className="status-dot" />
        {brand.appEyebrow}
      </div>
    </Link>
  );
}
