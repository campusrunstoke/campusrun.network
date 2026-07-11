"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function LoginForm() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [status, setStatus] = useState<"idle" | "submitting">("idle");
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (status === "submitting") return;
    setError(null);
    setStatus("submitting");
    try {
      const res = await fetch("/api/admin/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      if (res.ok) {
        router.replace("/admin");
        router.refresh();
        return;
      }
      if (res.status === 429) setError("Too many attempts. Wait a minute and try again.");
      else setError("Wrong email or password.");
      setStatus("idle");
    } catch {
      setError("Network error. Try again.");
      setStatus("idle");
    }
  }

  return (
    <main className="relative flex min-h-dvh items-center justify-center overflow-hidden bg-[#070B14] px-6 text-[#E5E9F0]">
      <Backdrop />

      <div className="relative z-10 w-full max-w-sm">
        <div className="mb-8 text-center">
          <div className="mb-2 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.25em] text-[#9AA6B8]">
            <span className="relative flex h-1.5 w-1.5">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[#FFCC00] opacity-75" />
              <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-[#FFCC00]" />
            </span>
            Ops Console
          </div>
          <h1 className="font-display text-3xl font-bold tracking-tight text-white">
            CAMPUS RUN
          </h1>
        </div>

        <form
          onSubmit={submit}
          className="rounded-2xl border border-white/10 bg-white/[0.03] p-7 shadow-2xl backdrop-blur-xl"
        >
          <label className="mb-1.5 block text-xs font-medium text-[#9AA6B8]">Email</label>
          <input
            type="email"
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            className="mb-4 h-11 w-full rounded-xl border border-white/10 bg-white/5 px-3.5 text-sm text-white outline-none transition-colors placeholder:text-[#5A6577] focus:border-[#FFCC00]/60 focus:bg-white/[0.07]"
            placeholder="you@campusrun.network"
          />

          <label className="mb-1.5 block text-xs font-medium text-[#9AA6B8]">Password</label>
          <input
            type="password"
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            className="h-11 w-full rounded-xl border border-white/10 bg-white/5 px-3.5 text-sm text-white outline-none transition-colors placeholder:text-[#5A6577] focus:border-[#FFCC00]/60 focus:bg-white/[0.07]"
            placeholder="••••••••••"
          />

          {error && (
            <p className="mt-4 rounded-lg border border-red-500/20 bg-red-500/10 px-3 py-2 text-xs text-red-300">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={status === "submitting"}
            className="mt-6 h-11 w-full rounded-xl bg-[#FFCC00] font-display text-sm font-bold text-[#0A1420] transition-all hover:bg-[#FFD633] active:scale-[0.99] disabled:opacity-60"
          >
            {status === "submitting" ? "Signing in…" : "Sign in"}
          </button>
        </form>

        <p className="mt-6 text-center text-[11px] text-[#5A6577]">
          Authorized personnel only · Campus Run
        </p>
      </div>
    </main>
  );
}

function Backdrop() {
  return (
    <>
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.12]"
        style={{
          backgroundImage:
            "linear-gradient(#1C2636 1px, transparent 1px), linear-gradient(90deg, #1C2636 1px, transparent 1px)",
          backgroundSize: "44px 44px",
        }}
      />
      <div className="pointer-events-none absolute -left-40 -top-40 h-96 w-96 rounded-full bg-[#FFCC00]/20 blur-[130px]" />
      <div className="pointer-events-none absolute -bottom-40 -right-40 h-96 w-96 rounded-full bg-[#22D3EE]/10 blur-[130px]" />
    </>
  );
}
