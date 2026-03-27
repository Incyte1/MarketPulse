import Link from "next/link";
import Panel from "@/components/ui/Panel";
import {
  getResearchMemo,
  researchMemos,
} from "@/lib/mock-unveni";
import { formatDateLabel } from "@/lib/utils";

export const dynamicParams = false;

export function generateStaticParams() {
  return researchMemos.map((memo) => ({
    slug: memo.slug,
  }));
}

export default async function ResearchMemoPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const memo = getResearchMemo(slug);

  return (
    <>
      <Panel className="p-6 sm:p-7 reveal-up">
        <div className="grid gap-8 xl:grid-cols-[1.05fr_0.95fr]">
          <div>
            <div className="eyebrow">Research Memo</div>
            <h1 className="mt-3 max-w-[14ch] text-[clamp(2.5rem,4.8vw,4.8rem)] leading-[0.92]">
              {memo.title}
            </h1>
            <p className="mt-5 max-w-[42rem] text-base leading-8 text-[color:var(--text-main)]">
              {memo.subtitle}
            </p>
          </div>

          <div className="workspace-summary-grid !grid-cols-1 sm:!grid-cols-2">
            <div className="workspace-stat">
              <div className="eyebrow">Symbol</div>
              <div className="mt-3 text-2xl font-semibold text-[color:var(--text-strong)]">
                {memo.symbol}
              </div>
              <div className="mt-2 text-sm text-[color:var(--text-muted)]">Primary coverage name</div>
            </div>

            <div className="workspace-stat">
              <div className="eyebrow">Status</div>
              <div className="mt-3 text-2xl font-semibold text-[color:var(--text-strong)]">
                {memo.status}
              </div>
              <div className="mt-2 text-sm text-[color:var(--text-muted)]">Research distribution state</div>
            </div>

            <div className="workspace-stat">
              <div className="eyebrow">Published</div>
              <div className="mt-3 text-2xl font-semibold text-[color:var(--text-strong)]">
                {formatDateLabel(memo.publishedAt)}
              </div>
              <div className="mt-2 text-sm text-[color:var(--text-muted)]">{memo.author}</div>
            </div>

            <div className="workspace-stat">
              <div className="eyebrow">Read Time</div>
              <div className="mt-3 text-2xl font-semibold text-[color:var(--text-strong)]">
                {memo.readingTime}
              </div>
              <div className="mt-2 text-sm text-[color:var(--text-muted)]">Structured internal memo</div>
            </div>
          </div>
        </div>
      </Panel>

      <div className="workspace-grid xl:grid-cols-[0.88fr_1.12fr]">
        <Panel className="p-6">
          <div className="eyebrow">Executive Summary</div>
          <div className="mt-4 text-lg leading-8 text-[color:var(--text-strong)]">
            {memo.executiveSummary}
          </div>

          <div className="workspace-callout mt-8">{memo.setup}</div>

          <div className="mt-8 flex flex-wrap gap-3">
            <Link
              href={`/workspace/symbol/${memo.symbol.toLowerCase()}`}
              prefetch={false}
              className="action-button-secondary px-4 py-3 text-sm"
            >
              Open Symbol
            </Link>
            <Link href="/workspace" prefetch={false} className="action-button-secondary px-4 py-3 text-sm">
              Back To Dashboard
            </Link>
          </div>
        </Panel>

        <Panel className="p-6">
          <div className="eyebrow">Memo Body</div>
          <div className="mt-6 space-y-10">
            {memo.sections.map((section) => (
              <section key={section.title} className="border-t border-[color:var(--line)] pt-6 first:border-t-0 first:pt-0">
                <div className="mono text-[11px] uppercase tracking-[0.24em] text-[color:var(--text-soft)]">
                  {section.label}
                </div>
                <h2 className="mt-3 text-2xl font-semibold text-[color:var(--text-strong)]">
                  {section.title}
                </h2>
                <div className="mt-5 space-y-5">
                  {section.paragraphs.map((paragraph) => (
                    <p key={paragraph} className="text-sm leading-8 text-[color:var(--text-muted)]">
                      {paragraph}
                    </p>
                  ))}
                </div>
              </section>
            ))}
          </div>
        </Panel>
      </div>

      <div className="workspace-grid xl:grid-cols-[0.85fr_1.15fr]">
        <Panel className="p-6">
          <div className="eyebrow">Key Levels</div>
          <div className="mt-2 text-xl font-semibold text-[color:var(--text-strong)]">
            What price needs to respect
          </div>

          <div className="workspace-table mt-8">
            {memo.keyLevels.map((level) => (
              <div
                key={level.label}
                className="workspace-table-row grid-cols-1 md:grid-cols-[150px_120px_minmax(0,1fr)]"
              >
                <div className="text-sm font-medium text-[color:var(--text-strong)]">{level.label}</div>
                <div className="text-sm text-[color:var(--text-main)]">{level.value}</div>
                <div className="text-sm text-[color:var(--text-soft)]">{level.note}</div>
              </div>
            ))}
          </div>
        </Panel>

        <Panel className="p-6">
          <div className="eyebrow">Risks</div>
          <div className="mt-2 text-xl font-semibold text-[color:var(--text-strong)]">
            Where the memo can fail
          </div>

          <div className="workspace-table mt-8">
            {memo.risks.map((risk) => (
              <div key={risk} className="workspace-table-row grid-cols-1">
                <div className="text-sm leading-8 text-[color:var(--text-muted)]">{risk}</div>
              </div>
            ))}
          </div>
        </Panel>
      </div>
    </>
  );
}
