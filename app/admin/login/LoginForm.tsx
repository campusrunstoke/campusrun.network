"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

/**
 * Admin sign-in card. Same design language as the /request-a-pilot form —
 * white card on the blurred blue field, ink inputs, ink action. Gold appears
 * only as the small "ops console" status dot (marks the live/authorized surface).
 */
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
    <div
      className="w-full max-w-[420px] rounded-2xl bg-white px-6 pb-9 pt-9 sm:px-10"
      style={{ boxShadow: "0 40px 90px rgba(0,20,32,.5)" }}
    >
      <div className="mb-2 inline-flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.1em] text-muted">
        <span className="h-1.5 w-1.5 rounded-full bg-gold" />
        Ops console
      </div>
      <h1 className="m-0 font-display text-[28px] font-bold tracking-[-0.02em] text-ink">
        Sign in
      </h1>
      <p className="mb-7 mt-1.5 text-[14px] leading-[1.5] text-muted">
        Campus Run team access.
      </p>

      <form onSubmit={submit} className="flex flex-col gap-[18px]">
        <label className="block">
          <span className="mb-2 block text-[14px] font-semibold text-ink">Email</span>
          <input
            type="email"
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            placeholder="you@campusrun.network"
            className="w-full rounded-lg border border-line bg-white px-3.5 py-3 text-[15px] text-ink placeholder:text-muted focus:border-ink focus:outline-none"
          />
        </label>

        <label className="block">
          <span className="mb-2 block text-[14px] font-semibold text-ink">Password</span>
          <input
            type="password"
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            className="w-full rounded-lg border border-line bg-white px-3.5 py-3 text-[15px] text-ink placeholder:text-muted focus:border-ink focus:outline-none"
          />
        </label>

        {error && (
          <div
            className="rounded-lg px-3.5 py-2.5 text-[13px]"
            style={{ background: "#fdeceb", color: "#b21e15" }}
          >
            {error}
          </div>
        )}

        <button
          type="submit"
          disabled={status === "submitting"}
          className="mt-1 w-full rounded-lg bg-ink py-[15px] text-[15px] font-semibold text-white transition-colors hover:bg-ink-deep disabled:opacity-60"
        >
          {status === "submitting" ? "Signing in…" : "Sign in"}
        </button>
      </form>

      <p className="mt-6 text-center text-[12px] text-muted">
        Authorized personnel only · Campus Run
      </p>
    </div>
  );
}
