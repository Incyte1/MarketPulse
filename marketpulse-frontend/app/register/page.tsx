"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { ensureAdminAccount, registerWithEmail, socialLogin } from "@/lib/auth";

export default function RegisterPage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    ensureAdminAccount();
  }, []);

  return (
    <main className="min-h-screen bg-[#070b14] px-6 py-10 text-white">
      <div className="mx-auto max-w-md rounded-3xl border border-white/10 bg-[#0b1323] p-8 shadow-2xl shadow-black/40">
        <div className="text-2xl font-semibold">Create your MarketPulse account</div>
        <p className="mt-2 text-sm text-slate-400">
          Start with email or continue with your social login.
        </p>

        <div className="mt-6 space-y-3">
          <button
            className="w-full rounded-xl border border-white/15 bg-white/5 px-4 py-3 text-left text-sm hover:bg-white/10"
            onClick={() => {
              socialLogin("google");
              router.push("/");
            }}
          >
            Sign up with Google
          </button>
          <button
            className="w-full rounded-xl border border-white/15 bg-white/5 px-4 py-3 text-left text-sm hover:bg-white/10"
            onClick={() => {
              socialLogin("facebook");
              router.push("/");
            }}
          >
            Sign up with Facebook
          </button>
        </div>

        <div className="my-5 border-t border-white/10" />

        <form
          className="space-y-3"
          onSubmit={(e) => {
            e.preventDefault();
            setError(null);
            try {
              registerWithEmail({ name, email, password });
              router.push("/login");
            } catch (err) {
              setError(err instanceof Error ? err.message : "Registration failed.");
            }
          }}
        >
          <input
            className="w-full rounded-xl border border-white/10 bg-[#050913] px-4 py-3 text-sm outline-none"
            placeholder="Full name"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
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
            Create account
          </button>
        </form>

        {error ? <div className="mt-3 text-sm text-rose-300">{error}</div> : null}

        <div className="mt-5 text-sm text-slate-400">
          Already have an account? <Link href="/login" className="text-cyan-300 underline">Log in</Link>
        </div>
      </div>
    </main>
  );
}
