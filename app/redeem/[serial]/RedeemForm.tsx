"use client";

import { useEffect, useState } from "react";

type Store = { id: string; name: string; needsPin: boolean };

// Staff pick their store once; it sticks for every pass they scan after that.
const STORE_KEY = "campusrun:redeem-store";

export default function RedeemForm({
  serial,
  alreadyRedeemed,
  redeemedAt,
  stores,
  presetStoreId,
}: {
  serial: string;
  alreadyRedeemed: boolean;
  redeemedAt: string | null;
  stores: Store[];
  presetStoreId: string | null;
}) {
  const [storeId, setStoreId] = useState(
    presetStoreId && stores.some((s) => s.id === presetStoreId) ? presetStoreId : (stores[0]?.id ?? ""),
  );
  const [pin, setPin] = useState("");
  const [amount, setAmount] = useState("");
  const [status, setStatus] = useState<"idle" | "submitting" | "done">(
    alreadyRedeemed ? "done" : "idle",
  );
  const [error, setError] = useState<string | null>(null);

  // Restore the remembered store (unless the URL preset one), and persist changes.
  // localStorage only exists after mount, so this is the one place a post-mount
  // setState is the right tool (the server render can't know the cashier's store).
  useEffect(() => {
    if (presetStoreId) return;
    try {
      const saved = localStorage.getItem(STORE_KEY);
      // eslint-disable-next-line react-hooks/set-state-in-effect
      if (saved && stores.some((s) => s.id === saved)) setStoreId(saved);
    } catch {
      /* storage unavailable */
    }
  }, [presetStoreId, stores]);
  useEffect(() => {
    try {
      if (storeId) localStorage.setItem(STORE_KEY, storeId);
    } catch {
      /* ignore */
    }
  }, [storeId]);

  const store = stores.find((s) => s.id === storeId);

  async function submit(ev: React.FormEvent) {
    ev.preventDefault();
    if (status !== "idle") return;
    setError(null);
    setStatus("submitting");
    const res = await fetch("/api/wallet/redeem", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ serial, method: "staff_scan", storeId, pin, amount }),
    });
    if (res.ok) {
      setStatus("done");
      return;
    }
    const data = await res.json().catch(() => ({}));
    const msg: Record<string, string> = {
      already_redeemed: "This coupon was already redeemed.",
      bad_pin: "Wrong staff PIN.",
      store_required: "Pick a store.",
      bad_store: "That store isn't valid for this coupon.",
      rate_limited: "Too many attempts — wait a minute.",
    };
    setError(msg[data.error] ?? "Couldn't redeem. Try again.");
    setStatus(data.error === "already_redeemed" ? "done" : "idle");
  }

  if (status === "done") {
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
        <h2 className="font-display text-3xl font-bold text-ink">Redeemed.</h2>
        <p className="mt-3 text-base text-muted">
          {alreadyRedeemed && redeemedAt
            ? `This coupon was used on ${new Date(redeemedAt).toLocaleDateString()}.`
            : "Logged. Hand over the goods."}
        </p>
      </div>
    );
  }

  if (stores.length === 0) {
    return (
      <p className="mt-10 rounded-2xl border-2 border-line bg-fill p-5 text-sm text-muted">
        No stores are set up for this campaign yet. Add one in the console under Wallet →
        campaign → Stores.
      </p>
    );
  }

  return (
    <form onSubmit={submit} className="mt-10 flex flex-1 flex-col">
      <label className="block">
        <span className="mb-1.5 block text-sm font-medium text-ink">Store</span>
        <select
          value={storeId}
          onChange={(e) => setStoreId(e.target.value)}
          className="h-14 w-full rounded-2xl border-2 border-line bg-fill px-4 text-base text-ink focus:border-ink focus:outline-none"
        >
          {stores.map((s) => (
            <option key={s.id} value={s.id}>
              {s.name}
            </option>
          ))}
        </select>
      </label>

      {store?.needsPin && (
        <label className="mt-5 block">
          <span className="mb-1.5 block text-sm font-medium text-ink">Staff PIN</span>
          <input
            type="password"
            inputMode="numeric"
            autoComplete="off"
            value={pin}
            onChange={(e) => setPin(e.target.value)}
            className="h-14 w-full rounded-2xl border-2 border-line bg-fill px-4 text-base text-ink focus:border-ink focus:outline-none"
          />
        </label>
      )}

      <label className="mt-5 block">
        <span className="mb-1.5 block text-sm font-medium text-ink">
          Purchase amount <span className="text-muted">— optional</span>
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

      {/* The one action, so it's gold. */}
      <button
        type="submit"
        disabled={status === "submitting"}
        className="mt-6 h-14 w-full rounded-2xl bg-gold font-display text-lg font-bold text-ink-deep transition-transform active:scale-[0.98] disabled:opacity-60"
      >
        {status === "submitting" ? "Logging…" : "Confirm redemption"}
      </button>
    </form>
  );
}
