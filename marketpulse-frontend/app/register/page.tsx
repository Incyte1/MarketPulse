"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import AuthShell from "@/components/AuthShell";
import { registerWithEmail, restoreSession } from "@/lib/auth";
import { brand } from "@/lib/brand";

export default function RegisterPage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
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
      eyebrow="New Workspace"
      title={`Create a real ${brand.name} account.`}
      subtitle={brand.registerPrompt}
      altHref="/login"
      altLabel="Log in"
      altPrompt="Already have access?"
    >
      <div>
        <div className="eyebrow">Account Setup</div>
        <div className="mt-3 text-3xl font-semibold tracking-tight text-white">
          Open your workspace.
        </div>
        <p className="mt-3 text-sm leading-6 text-slate-300">
          This is a real account flow backed by the API, not a local-only demo login.
        </p>
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        <span className="desk-chip mono">1 Profile</span>
        <span className="desk-chip mono">2 Security</span>
        <span className="desk-chip mono">3 Workspace</span>
      </div>

      <form
        className="mt-6 space-y-4"
        onSubmit={async (e) => {
          e.preventDefault();
          setError(null);

          const trimmedName = name.trim();
          const trimmedEmail = email.trim();

          if (!trimmedName) {
            setError("Full name is required.");
            return;
          }

          if (!trimmedEmail) {
            setError("Email is required.");
            return;
          }

          if (password.length < 8) {
            setError("Password must be at least 8 characters.");
            return;
          }

          if (password !== confirmPassword) {
            setError("Passwords do not match.");
            return;
          }

          setLoading(true);
          try {
            await registerWithEmail({ name: trimmedName, email: trimmedEmail, password });
            router.push("/workspace");
          } catch (err) {
            setError(err instanceof Error ? err.message : "Registration failed.");
          } finally {
            setLoading(false);
          }
        }}
      >
        <div className="space-y-2">
          <label className="field-label" htmlFor="name">
            Full Name
          </label>
          <input
            id="name"
            className="text-input"
            placeholder="Morgan Lee"
            autoComplete="name"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
        </div>

        <div className="space-y-2">
          <label className="field-label" htmlFor="email">
            Work Email
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
              placeholder="At least 8 characters"
              type={showPassword ? "text" : "password"}
              autoComplete="new-password"
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

        <div className="space-y-2">
          <label className="field-label" htmlFor="confirm-password">
            Confirm Password
          </label>
          <input
            id="confirm-password"
            className="text-input"
            placeholder="Repeat your password"
            type="password"
            autoComplete="new-password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
          />
        </div>

        <div className="grid gap-2 rounded-[18px] border border-white/10 bg-white/[0.025] p-4 text-sm text-slate-300">
          <div className={password.length >= 8 ? "signal-positive" : "text-slate-400"}>
            At least 8 characters
          </div>
          <div
            className={
              confirmPassword.length > 0 && password === confirmPassword
                ? "signal-positive"
                : "text-slate-400"
            }
          >
            Passwords match
          </div>
        </div>

        {error ? (
          <div className="rounded-2xl border border-rose-500/20 bg-rose-500/10 p-4 text-sm text-rose-200">
            {error}
          </div>
        ) : null}

        <button className="action-button w-full" disabled={loading}>
          {loading ? "Creating account..." : "Create account"}
        </button>
      </form>
    </AuthShell>
  );
}
