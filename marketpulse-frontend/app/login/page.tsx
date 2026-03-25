"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { ensureAdminAccount, loginWithEmail, socialLogin } from "@/lib/auth";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [adminHint, setAdminHint] = useState("");

  useEffect(() => {
    const admin = ensureAdminAccount();
    setAdminHint(`${admin.email} / ${admin.password}`);
  }, []);

  return (
    <main className="min-h-screen bg-[#070b14] px-6 py-10 text-white">
      <div className="mx-auto max-w-md rounded-3xl border border-white/10 bg-[#0b1323] p-8 shadow-2xl shadow-black/40">
        <div className="text-2xl font-semibold">Welcome back to MarketPulse</div>
        <p className="mt-2 text-sm text-slate-400">
          Professional market intelligence in one place.
        </p>

        <div className="mt-6 space-y-3">
          <button
            className="w-full rounded-xl border border-white/15 bg-white/5 px-4 py-3 text-left text-sm hover:bg-white/10"
            onClick={() => {
              socialLogin("google");
              router.push("/");
            }}
          >
            Continue with Google
          </button>
          <button
            className="w-full rounded-xl border border-white/15 bg-white/5 px-4 py-3 text-left text-sm hover:bg-white/10"
            onClick={() => {
              socialLogin("facebook");
              router.push("/");
            }}
          >
            Continue with Facebook
          </button>
        </div>

        <div className="my-5 border-t border-white/10" />

        <form
          className="space-y-3"
          onSubmit={(e) => {
            e.preventDefault();
            setError(null);
            try {
              loginWithEmail(email, password);
              router.push("/");
            } catch (err) {
              setError(err instanceof Error ? err.message : "Login failed.");
            }
          }}
        >
          <input
            className="w-full rounded-xl border border-white/10 bg-[#050913] px-4 py-3 text-sm outline-none"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
          <input
            className="w-full rounded-xl border border-white/10 bg-[#050913] px-4 py-3 text-sm outline-none"
            placeholder="Password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
          <button className="w-full rounded-xl bg-emerald-500 px-4 py-3 text-sm font-semibold text-black">
            Log in
          </button>
        </form>

        {error ? <div className="mt-3 text-sm text-rose-300">{error}</div> : null}

        <div className="mt-5 rounded-xl border border-cyan-500/20 bg-cyan-500/10 p-3 text-xs text-cyan-100">
          Admin account seeded for you: <span className="font-semibold">{adminHint}</span>
        </div>

        <div className="mt-5 text-sm text-slate-400">
          New here? <Link href="/register" className="text-cyan-300 underline">Create an account</Link>
        </div>
      </div>
    </main>
  );
}
