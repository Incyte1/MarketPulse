"use client";

import { useState } from "react";
import Button from "@/components/ui/Button";
import { Input, Textarea } from "@/components/ui/Input";
import Panel from "@/components/ui/Panel";
import { settingsSections } from "@/lib/mock-unveni";

function ToggleRow({
  label,
  helper,
  enabled,
  onToggle,
}: {
  label: string;
  helper: string;
  enabled: boolean;
  onToggle: () => void;
}) {
  return (
    <div className="workspace-table-row grid-cols-[minmax(0,1fr)_84px]">
      <div>
        <div className="text-sm font-medium text-[color:var(--text-strong)]">{label}</div>
        <div className="mt-2 text-sm leading-7 text-[color:var(--text-muted)]">{helper}</div>
      </div>

      <button
        type="button"
        onClick={onToggle}
        className={`ml-auto inline-flex h-10 w-20 items-center rounded-full border px-1 transition ${
          enabled
            ? "border-[rgba(200,163,106,0.34)] bg-[rgba(200,163,106,0.18)]"
            : "border-[color:var(--line)] bg-[rgba(255,255,255,0.04)]"
        }`}
        aria-pressed={enabled}
      >
        <span
          className={`h-8 w-8 rounded-full transition ${
            enabled
              ? "translate-x-10 bg-[color:var(--accent-strong)]"
              : "translate-x-0 bg-[rgba(255,255,255,0.22)]"
          }`}
        />
      </button>
    </div>
  );
}

export default function SettingsPage() {
  const [emailDigest, setEmailDigest] = useState(true);
  const [smsWarnings, setSmsWarnings] = useState(true);
  const [memoDistribution, setMemoDistribution] = useState(true);
  const [saved, setSaved] = useState(false);

  return (
    <>
      <Panel className="p-6 sm:p-7 reveal-up">
        <div className="grid gap-8 xl:grid-cols-[1.05fr_0.95fr]">
          <div>
            <div className="eyebrow">Settings</div>
            <h1 className="mt-3 max-w-[12ch] text-[clamp(2.4rem,4.8vw,4.4rem)] leading-[0.94]">
              Desk preferences, delivery, and account configuration.
            </h1>
            <p className="mt-5 max-w-[42rem] text-base leading-8 text-[color:var(--text-muted)]">
              Configure how research is framed, where alerts leave the product, and how the
              workspace opens by default.
            </p>
          </div>

          <div className="workspace-summary-grid !grid-cols-1 sm:!grid-cols-2">
            {settingsSections.map((section) => (
              <div key={section.title} className="workspace-stat">
                <div className="eyebrow">{section.title}</div>
                <div className="mt-3 text-xl font-semibold text-[color:var(--text-strong)]">
                  {section.fields[0]?.value}
                </div>
                <div className="mt-2 text-sm text-[color:var(--text-muted)]">
                  {section.description}
                </div>
              </div>
            ))}
          </div>
        </div>
      </Panel>

      <div className="workspace-grid xl:grid-cols-[0.95fr_1.05fr]">
        <Panel className="p-6">
          <div className="eyebrow">Account</div>
          <div className="mt-2 text-xl font-semibold text-[color:var(--text-strong)]">
            Identity and workspace ownership
          </div>

          <div className="mt-8 space-y-5">
            {settingsSections[0].fields.map((field) => (
              <div key={field.label} className="space-y-2">
                <label className="field-label">{field.label}</label>
                <Input value={field.value} readOnly />
                <div className="text-sm leading-7 text-[color:var(--text-soft)]">{field.helper}</div>
              </div>
            ))}
          </div>
        </Panel>

        <Panel className="p-6">
          <div className="eyebrow">Preferences</div>
          <div className="mt-2 text-xl font-semibold text-[color:var(--text-strong)]">
            Default research posture
          </div>

          <div className="mt-8 space-y-5">
            <div className="space-y-2">
              <label className="field-label" htmlFor="default-horizon">
                Default horizon
              </label>
              <Input id="default-horizon" defaultValue={settingsSections[1].fields[0].value} />
            </div>

            <div className="space-y-2">
              <label className="field-label" htmlFor="benchmark">
                Primary benchmark
              </label>
              <Input id="benchmark" defaultValue={settingsSections[1].fields[1].value} />
            </div>

            <div className="space-y-2">
              <label className="field-label" htmlFor="memo-framing">
                Memo framing
              </label>
              <Textarea id="memo-framing" defaultValue={settingsSections[1].fields[2].helper} />
            </div>
          </div>
        </Panel>
      </div>

      <div className="workspace-grid xl:grid-cols-[0.95fr_1.05fr]">
        <Panel className="p-6">
          <div className="eyebrow">Notifications</div>
          <div className="mt-2 text-xl font-semibold text-[color:var(--text-strong)]">
            Delivery rules for important signals
          </div>

          <div className="workspace-table mt-8">
            <ToggleRow
              label="Email digest"
              helper="Deliver the close-of-day memo bundle to the assigned research distribution."
              enabled={emailDigest}
              onToggle={() => setEmailDigest((current) => !current)}
            />
            <ToggleRow
              label="SMS warnings"
              helper="Only invalidation or risk escalation events should break out to SMS."
              enabled={smsWarnings}
              onToggle={() => setSmsWarnings((current) => !current)}
            />
            <ToggleRow
              label="Memo auto-distribution"
              helper="Send finalized memos to the desk list without a second confirmation step."
              enabled={memoDistribution}
              onToggle={() => setMemoDistribution((current) => !current)}
            />
          </div>
        </Panel>

        <Panel className="p-6">
          <div className="eyebrow">Controls</div>
          <div className="mt-2 text-xl font-semibold text-[color:var(--text-strong)]">
            Workspace maintenance
          </div>

          <div className="mt-8 space-y-5">
            <div className="space-y-2">
              <label className="field-label" htmlFor="distribution-note">
                Distribution note
              </label>
              <Textarea
                id="distribution-note"
                defaultValue="Reserve urgent distribution for events that change the trade decision, not routine updates."
              />
            </div>

            <div className="flex flex-wrap gap-3">
              <Button
                onClick={() => {
                  setSaved(true);
                }}
              >
                Save Changes
              </Button>
              <Button
                variant="secondary"
                onClick={() => {
                  setEmailDigest(true);
                  setSmsWarnings(true);
                  setMemoDistribution(true);
                  setSaved(false);
                }}
              >
                Restore Defaults
              </Button>
            </div>

            {saved ? (
              <div className="rounded-[18px] border border-[rgba(134,195,139,0.28)] bg-[rgba(134,195,139,0.1)] p-4 text-sm text-[color:var(--text-strong)]">
                Settings updated for this session preview.
              </div>
            ) : null}
          </div>
        </Panel>
      </div>
    </>
  );
}
