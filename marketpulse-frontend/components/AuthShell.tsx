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
    <main className="marketing-viewport auth-page safe-shell">
      <div className="landing-visual-plane auth-visual-plane" aria-hidden="true">
        <div className="landing-visual-grid" />
        <div className="landing-visual-chart landing-visual-chart-primary" />
        <div className="landing-visual-chart landing-visual-chart-secondary" />
      </div>

      <div className="auth-grid">
        <section className="auth-copy">
          <BrandLockup />

          <div className="mt-14">
            <div className="eyebrow">{eyebrow}</div>
            <h1 className="mt-4 max-w-[12ch] text-[clamp(2.4rem,4.8vw,4.6rem)] leading-[0.94]">
              {title}
            </h1>
            <p className="mt-5 max-w-[34rem] text-base leading-8 text-[color:var(--text-main)] sm:text-lg">
              {subtitle}
            </p>
          </div>

          <div className="auth-footnote">
            {altPrompt}{" "}
            <Link href={altHref} prefetch={false} className="text-[color:var(--accent-strong)] underline underline-offset-4">
              {altLabel}
            </Link>
          </div>
        </section>

        <section className="workspace-panel auth-panel">{children}</section>
      </div>
    </main>
  );
}
