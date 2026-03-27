import Link from "next/link";

const HERO_TAPE = [
  "NVDA 1088.46  +1.42%",
  "MSFT 512.20  +0.66%",
  "SPY 648.31  +0.21%",
  "XOM 132.78  -0.48%",
  "QQQ 562.11  +0.39%",
  "TNX 4.08  -0.03",
];

const OPERATING_LOOP = [
  {
    label: "Read",
    title: "Price, sentiment, and catalysts are interpreted as one market object.",
    copy: "The desk does not need to assemble the narrative by hand before it can trust the setup.",
  },
  {
    label: "Stress",
    title: "Every trade idea is framed through risk, invalidation, and scenario pressure.",
    copy: "Unveni stays calm by surfacing what could break the thesis before the desk commits more capital.",
  },
  {
    label: "Decide",
    title: "Research stays linked to the active surface instead of drifting into detached notes.",
    copy: "Signals, levels, memos, and action context remain on the same operating plane.",
  },
];

const SURFACE_PANELS = [
  {
    title: "Coverage",
    copy: "High-liquidity symbols, benchmark context, and ranked focus names stay visible without overwhelming the page.",
  },
  {
    title: "Catalysts",
    copy: "The timeline is filtered to what can move positioning, not just what happened recently.",
  },
  {
    title: "Memos",
    copy: "Every research note opens with the executive summary, key levels, and the risk stack.",
  },
];

export default function HomePage() {
  return (
    <main className="app-shell">
      <section className="landing-hero safe-shell">
        <div className="landing-visual-plane" aria-hidden="true">
          <div className="landing-visual-grid" />
          <div className="landing-visual-chart landing-visual-chart-primary" />
          <div className="landing-visual-chart landing-visual-chart-secondary" />

          <div className="landing-visual-ledger">
            {HERO_TAPE.map((item) => (
              <div key={item} className="landing-ledger-row mono">
                {item}
              </div>
            ))}
          </div>
        </div>

        <div className="landing-copy reveal-up">
          <div className="brand-poster text-[clamp(5rem,15vw,12rem)] font-semibold text-[color:var(--text-strong)]">
            Unveni
          </div>
          <h1 className="mt-4 max-w-[12ch] text-[clamp(2.4rem,5vw,5rem)] leading-[0.92]">
            Institutional market review without terminal bloat.
          </h1>
          <p className="mt-6 max-w-[32rem] text-base leading-8 text-[color:var(--text-main)] sm:text-lg">
            Market data, sentiment, and catalysts translated into structured intelligence for
            traders and analysts.
          </p>

          <div className="mt-8 flex flex-wrap gap-3">
            <Link href="/register" prefetch={false} className="action-button px-5 py-3 text-sm">
              Request Access
            </Link>
            <Link href="/login" prefetch={false} className="action-button-secondary px-5 py-3 text-sm">
              Sign In
            </Link>
          </div>
        </div>
      </section>

      <section className="landing-section safe-shell">
        <div className="mx-auto max-w-[1440px]">
          <div className="max-w-[56rem]">
            <div className="eyebrow">Operating Loop</div>
            <h2 className="mt-4 text-[clamp(2rem,4vw,3.7rem)] leading-[0.96]">
              One desk surface from market read to risk-aware decision.
            </h2>
            <p className="mt-5 max-w-[40rem] text-base leading-8 text-[color:var(--text-muted)]">
              The product is built to compress interpretation time without flattening the quality
              of the research.
            </p>
          </div>

          <div className="mt-14">
            {OPERATING_LOOP.map((item) => (
              <div key={item.label} className="landing-flow-row">
                <div className="mono text-xs uppercase tracking-[0.24em] text-[color:var(--text-soft)]">
                  {item.label}
                </div>
                <div>
                  <div className="text-2xl font-semibold text-[color:var(--text-strong)]">
                    {item.title}
                  </div>
                  <div className="mt-3 max-w-[44rem] text-sm leading-8 text-[color:var(--text-muted)]">
                    {item.copy}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="landing-section landing-surface-band safe-shell">
        <div className="mx-auto max-w-[1440px]">
          <div className="max-w-[48rem]">
            <div className="eyebrow">Workspace</div>
            <h2 className="mt-4 text-[clamp(2rem,4vw,3.7rem)] leading-[0.96]">
              Built like a research desk, not a dashboard collage.
            </h2>
            <p className="mt-5 max-w-[38rem] text-base leading-8 text-[color:var(--text-muted)]">
              Coverage, catalysts, and memo flow live in one quiet analytical system with enough
              density to make the page useful without turning it noisy.
            </p>
          </div>

          <div className="landing-surface-preview">
            <div className="landing-surface-columns">
              {SURFACE_PANELS.map((item) => (
                <div key={item.title} className="landing-surface-column">
                  <div className="mono text-[11px] uppercase tracking-[0.24em] text-[color:var(--text-soft)]">
                    {item.title}
                  </div>
                  <div className="mt-4 text-lg font-semibold text-[color:var(--text-strong)]">
                    {item.copy}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="landing-section safe-shell">
        <div className="mx-auto max-w-[1440px]">
          <div className="max-w-[42rem]">
            <div className="eyebrow">Access</div>
            <h2 className="mt-4 text-[clamp(2rem,4vw,3.7rem)] leading-[0.96]">
              Request access to the Unveni desk.
            </h2>
            <p className="mt-5 text-base leading-8 text-[color:var(--text-muted)]">
              The product is designed for analysts and traders who need structured conviction,
              clear risk framing, and a calmer surface than a general-purpose terminal.
            </p>
          </div>

          <div className="mt-8 flex flex-wrap gap-3">
            <Link href="/register" prefetch={false} className="action-button px-5 py-3 text-sm">
              Request Access
            </Link>
            <Link href="/login" prefetch={false} className="action-button-secondary px-5 py-3 text-sm">
              Sign In
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}
