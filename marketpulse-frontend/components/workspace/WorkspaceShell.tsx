"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import BrandLockup from "@/components/BrandLockup";
import { buttonClassName } from "@/components/ui/Button";
import Panel from "@/components/ui/Panel";
import LiveDeskClock from "@/components/workspace/LiveDeskClock";
import WorkspaceCommand from "@/components/workspace/WorkspaceCommand";
import { brand } from "@/lib/brand";
import {
  dashboardSnapshot,
  defaultResearchMemo,
  defaultSymbol,
  symbols,
} from "@/lib/mock-unveni";
import { restoreSession, type AuthSession } from "@/lib/auth";
import { cx } from "@/lib/utils";

type WorkspaceShellProps = {
  children: ReactNode;
};

const navItems = [
  {
    label: "Dashboard",
    href: "/workspace",
    match: (pathname: string) => pathname === "/workspace",
  },
  {
    label: "Symbol",
    href: `/workspace/symbol/${defaultSymbol.symbol.toLowerCase()}`,
    match: (pathname: string) => pathname.startsWith("/workspace/symbol"),
  },
  {
    label: "Memo",
    href: `/workspace/research/${defaultResearchMemo.slug}`,
    match: (pathname: string) => pathname.startsWith("/workspace/research"),
  },
  {
    label: "Settings",
    href: "/workspace/settings",
    match: (pathname: string) => pathname.startsWith("/workspace/settings"),
  },
];

export default function WorkspaceShell({ children }: WorkspaceShellProps) {
  const pathname = usePathname();
  const [session, setSession] = useState<AuthSession | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let active = true;

    restoreSession()
      .then((nextSession) => {
        if (!active) return;
        setSession(nextSession);
        setReady(true);
      })
      .catch(() => {
        if (!active) return;
        setSession(null);
        setReady(true);
      });

    return () => {
      active = false;
    };
  }, []);

  return (
    <div className="app-shell workspace-root">
      <aside className="workspace-sidebar">
        <Panel className="workspace-sidebar-panel">
          <BrandLockup compact />

          <div className="workspace-sidebar-group workspace-sidebar-nav">
            {navItems.map((item) => (
              <Link
                key={item.label}
                href={item.href}
                prefetch={false}
                className={cx(
                  "workspace-link",
                  item.match(pathname) && "workspace-link-active"
                )}
              >
                {item.label}
              </Link>
            ))}
          </div>

          <div className="workspace-sidebar-group workspace-sidebar-coverage">
            <div className="eyebrow">Coverage</div>
            <div className="space-y-2">
              {symbols.slice(0, 4).map((item) => (
                <Link
                  key={item.symbol}
                  href={`/workspace/symbol/${item.symbol.toLowerCase()}`}
                  prefetch={false}
                  className="workspace-mini-link"
                >
                  <span>{item.symbol}</span>
                  <span>{item.name}</span>
                </Link>
              ))}
            </div>
          </div>

          <div className="workspace-sidebar-foot">
            <div className="eyebrow">Desk State</div>
            <p className="text-sm leading-7 text-[color:var(--text-muted)]">
              {dashboardSnapshot.marketBackdrop}
            </p>
          </div>
        </Panel>
      </aside>

      <div className="workspace-stage">
        <header className="workspace-topbar">
          <div className="workspace-topbar-copy">
            <div className="eyebrow">Desk Command</div>
            <div className="workspace-topbar-summary mt-2 max-w-xl text-sm leading-7 text-[color:var(--text-muted)]">
              {brand.appSummary}
            </div>
          </div>

          <div className="workspace-topbar-actions">
            <div className="workspace-meta-chip">
              <span className="status-dot" />
              <LiveDeskClock />
            </div>

            <div className="workspace-meta-chip">
              {ready ? (
                session ? (
                  <>
                    <span className="text-[color:var(--text-strong)]">{session.user.name}</span>
                    <span className="text-[color:var(--text-soft)]">{session.user.role}</span>
                  </>
                ) : (
                  <>
                    <span className="text-[color:var(--text-strong)]">Demo desk</span>
                    <span className="text-[color:var(--text-soft)]">Preview mode</span>
                  </>
                )
              ) : (
                <span className="text-[color:var(--text-soft)]">Restoring session</span>
              )}
            </div>

            {!session ? (
              <Link href="/login" prefetch={false} className={buttonClassName({ variant: "secondary" })}>
                Sign In
              </Link>
            ) : null}
          </div>
        </header>

        <div className="workspace-toolbar">
          <WorkspaceCommand />
        </div>

        <main className="workspace-canvas">{children}</main>
      </div>
    </div>
  );
}
