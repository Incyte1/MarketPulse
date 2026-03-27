"use client";

import { useState } from "react";
import Link from "next/link";
import AuthShell from "@/components/AuthShell";
import Button from "@/components/ui/Button";
import { Input, Textarea } from "@/components/ui/Input";
import { brand } from "@/lib/brand";

export default function RegisterPage() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [team, setTeam] = useState("");
  const [focus, setFocus] = useState("");
  const [submitted, setSubmitted] = useState(false);

  if (submitted) {
    return (
      <AuthShell
        eyebrow="Access Requested"
        title="Your request is in the queue."
        subtitle="The access team will review the seat request and follow up over email."
        altHref="/login"
        altLabel="Sign in"
        altPrompt="Already approved?"
      >
        <div className="p-6 sm:p-7">
          <div className="eyebrow">Request Logged</div>
          <div className="mt-3 text-2xl font-semibold text-[color:var(--text-strong)]">
            We have your desk details.
          </div>
          <p className="mt-4 text-sm leading-7 text-[color:var(--text-muted)]">
            You should expect a follow-up at <span className="text-[color:var(--text-strong)]">{email}</span>{" "}
            once the request has been reviewed.
          </p>

          <div className="workspace-callout mt-8">
            Until access is approved, you can still review the public product positioning and return
            here when the invitation arrives.
          </div>

          <div className="mt-8 flex flex-wrap gap-3">
            <Link href="/" prefetch={false} className="action-button-secondary px-4 py-3 text-sm">
              Back to Landing
            </Link>
            <Link href="/login" prefetch={false} className="action-button px-4 py-3 text-sm">
              Sign In
            </Link>
          </div>
        </div>
      </AuthShell>
    );
  }

  return (
    <AuthShell
      eyebrow="Request Access"
      title="Join the Unveni desk."
      subtitle={brand.registerPrompt}
      altHref="/login"
      altLabel="Sign in"
      altPrompt="Already have access?"
    >
      <div className="p-6 sm:p-7">
        <div className="eyebrow">Seat Request</div>
        <div className="mt-3 text-2xl font-semibold text-[color:var(--text-strong)]">
          Request analyst access.
        </div>
        <p className="mt-3 text-sm leading-7 text-[color:var(--text-muted)]">
          Share the desk context and coverage focus so the workspace can be configured correctly.
        </p>

        <form
          className="mt-8 space-y-5"
          onSubmit={(event) => {
            event.preventDefault();
            setSubmitted(true);
          }}
        >
          <div className="space-y-2">
            <label className="field-label" htmlFor="name">
              Full name
            </label>
            <Input
              id="name"
              placeholder="Morgan Lee"
              value={name}
              onChange={(event) => setName(event.target.value)}
              required
            />
          </div>

          <div className="space-y-2">
            <label className="field-label" htmlFor="email">
              Work email
            </label>
            <Input
              id="email"
              type="email"
              placeholder="analyst@firm.com"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              required
            />
          </div>

          <div className="space-y-2">
            <label className="field-label" htmlFor="team">
              Firm or team
            </label>
            <Input
              id="team"
              placeholder="Equity strategy"
              value={team}
              onChange={(event) => setTeam(event.target.value)}
              required
            />
          </div>

          <div className="space-y-2">
            <label className="field-label" htmlFor="focus">
              Coverage focus
            </label>
            <Textarea
              id="focus"
              placeholder="Large-cap growth, macro catalysts, and event-driven research."
              value={focus}
              onChange={(event) => setFocus(event.target.value)}
              required
            />
          </div>

          <Button type="submit" block>
            Request Access
          </Button>
        </form>
      </div>
    </AuthShell>
  );
}
