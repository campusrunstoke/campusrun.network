"use client";

import { useState } from "react";

export default function ReceiptForm({
  serial,
  brand,
  alreadyRedeemed,
}: {
  serial: string;
  brand: string;
  alreadyRedeemed: boolean;
}) {
  const [storeName, setStoreName] = useState("");
  const [amount, setAmount] = useState("");
  const [status, setStatus] = useState<"idle" | "submitting" | "done">(
    alreadyRedeemed ? "done" : "idle",
  );
  const [error, setError] = useState<string | null>(null);

  async function submit(ev: React.FormEvent) {
    ev.preventDefault();
    if (status !== "idle") return;
    if (!storeName.trim()) {
      setError("Which store?");
      return;
    }
    setError(null);
    setStatus("submitting");
    const res = await fetch("/api/wallet/redeem", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ serial, method: "receipt", storeName, amount }),
    });
    if (res.ok || res.status === 409) {
      setStatus("done");
      return;
    }
    setStatus("idle");
    setError("That didn't send. Try again.");
  }

  if (status === "done") {
    // Two different endings: this coupon was already counted (often at the register),
    // or they just told us now. Showing "Thanks" for the first one reads as a bug.
    return (
      <div className="flex flex-1 flex-col items-center justify-center text-center">
        <div className="mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-gold">
          <svg width="30" height="30" viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <path
              d="M5 12.5l4.5 4.5L19 7.5"
              stroke="#002942"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </div>
        <h2 className="font-display text-3xl font-bold text-ink">
          {alreadyRedeemed ? "Already counted." : "Thanks."}
        </h2>
        <p className="mt-3 max-w-xs text-base text-muted">
          {alreadyRedeemed
            ? "This coupon was already used, so there's nothing to add."
            : "Stay stoked."}
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={submit} className="flex flex-1 flex-col">
      <div className="mb-10 mt-8">
        <div className="text-sm font-semibold uppercase tracking-wider text-muted">{brand}</div>
        <h1 className="mt-2 font-display text-3xl font-bold leading-tight text-ink">
          Bought it? Tell us where.
        </h1>
        <p className="mt-3 text-base leading-relaxed text-muted">Takes ten seconds.</p>
      </div>
      <label className="block">
        <span className="mb-1.5 block text-sm font-medium text-ink">Store</span>
        <input
          value={storeName}
          onChange={(e) => setStoreName(e.target.value)}
          placeholder="Ralphs on Lincoln"
          autoComplete="off"
          className="h-14 w-full rounded-2xl border-2 border-line bg-fill px-4 text-base text-ink placeholder:text-muted focus:border-ink focus:outline-none"
        />
      </label>
      <label className="mt-5 block">
        <span className="mb-1.5 block text-sm font-medium text-ink">
          How much <span className="text-muted">— optional</span>
        </span>
        <input
          type="number"
          inputMode="decimal"
          step="0.01"
          min="0"
          placeholder="0.00"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          className="h-14 w-full rounded-2xl border-2 border-line bg-fill px-4 text-base text-ink placeholder:text-muted focus:border-ink focus:outline-none"
        />
      </label>

      {error && <p className="mt-4 text-sm font-medium text-ink-deep">{error}</p>}

      <button
        type="submit"
        disabled={status === "submitting"}
        className="mt-6 h-14 w-full rounded-2xl bg-gold font-display text-lg font-bold text-ink-deep transition-transform active:scale-[0.98] disabled:opacity-60"
      >
        {status === "submitting" ? "Sending…" : "I bought it"}
      </button>
    </form>
  );
}
