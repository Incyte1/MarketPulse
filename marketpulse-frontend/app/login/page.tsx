"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import AuthShell from "@/components/AuthShell";
import Button from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { loginWithEmail, restoreSession } from "@/lib/auth";
import { brand } from "@/lib/brand";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let active = true;

    restoreSession()
      .then((session) => {
        if (active && session) {
          router.replace("/workspace");
        }
      })
      .catch(() => null);

    return () => {
      active = false;
    };
  }, [router]);

  return (
    <AuthShell
      eyebrow="Secure Sign-In"
      title="Return to the desk."
      subtitle={brand.loginPrompt}
      altHref="/register"
      altLabel="Request access"
      altPrompt="Need an invitation?"
    >
      <div className="p-6 sm:p-7">
        <div className="eyebrow">Desk Access</div>
        <div className="mt-3 text-2xl font-semibold text-[color:var(--text-strong)]">
          Sign in to restore your workspace.
        </div>
        <p className="mt-3 text-sm leading-7 text-[color:var(--text-muted)]">
          Watchlists, memo state, and the last active market context return with the session.
        </p>

        <form
          className="mt-8 space-y-5"
          onSubmit={async (event) => {
            event.preventDefault();
            setError(null);
            setLoading(true);

            try {
              await loginWithEmail(email.trim(), password);
              router.push("/workspace");
            } catch (err) {
              setError(err instanceof Error ? err.message : "Login failed.");
            } finally {
              setLoading(false);
            }
          }}
        >
          <div className="space-y-2">
            <label className="field-label" htmlFor="email">
              Work email
            </label>
            <Input
              id="email"
              placeholder="analyst@firm.com"
              autoComplete="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
            />
          </div>

          <div className="space-y-2">
            <label className="field-label" htmlFor="password">
              Password
            </label>
            <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_96px]">
              <Input
                id="password"
                placeholder="Enter your password"
                type={showPassword ? "text" : "password"}
                autoComplete="current-password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
              />

              <Button
                type="button"
                variant="secondary"
                onClick={() => setShowPassword((current) => !current)}
              >
                {showPassword ? "Hide" : "Show"}
              </Button>
            </div>
          </div>

          {error ? (
            <div className="rounded-[18px] border border-[rgba(221,132,105,0.32)] bg-[rgba(221,132,105,0.12)] p-4 text-sm text-[color:var(--text-strong)]">
              {error}
            </div>
          ) : null}

          <Button type="submit" block disabled={loading}>
            {loading ? "Signing in..." : "Open Workspace"}
          </Button>
        </form>
      </div>
    </AuthShell>
  );
}
