"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import AuthShell from "@/components/AuthShell";
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
      title="Return to the active desk."
      subtitle={brand.loginPrompt}
      altHref="/register"
      altLabel="Create an account"
      altPrompt={`New to ${brand.name}?`}
    >
      <div>
        <div className="eyebrow">Desk Access</div>
        <div className="mt-3 text-3xl font-semibold tracking-tight text-white">
          Sign in and restore your workspace.
        </div>
        <p className="mt-3 text-sm leading-7 text-slate-300">
          Workspaces, alerts, memo state, and the current desk context come back before the product opens.
        </p>
      </div>

      <form
        className="mt-6 space-y-4"
        onSubmit={async (e) => {
          e.preventDefault();
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
            Email
          </label>
          <input
            id="email"
            className="text-input"
            placeholder="analyst@firm.com"
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </div>

        <div className="space-y-2">
          <label className="field-label" htmlFor="password">
            Password
          </label>
          <div className="flex gap-2">
            <input
              id="password"
              className="text-input"
              placeholder="Enter your password"
              type={showPassword ? "text" : "password"}
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
            <button
              type="button"
              className="action-button-secondary min-w-[82px]"
              onClick={() => setShowPassword((current) => !current)}
            >
              {showPassword ? "Hide" : "Show"}
            </button>
          </div>
        </div>

        {error ? (
          <div className="rounded-2xl border border-rose-500/20 bg-rose-500/10 p-4 text-sm text-rose-200">
            {error}
          </div>
        ) : null}

        <button className="action-button w-full" disabled={loading}>
          {loading ? "Signing in..." : "Open Desk"}
        </button>
      </form>
    </AuthShell>
  );
}
