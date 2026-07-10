"use client";

import { useCallback, useEffect, useState } from "react";

type Props = { e: string | null; b: string | null; c: string | null };

type Payload = {
  rating: number;
  email: string | null;
  e: string | null;
  b: string | null;
  c: string | null;
};

const QUEUE_KEY = "campusrun:queue";
const RATINGS = [1, 2, 3, 4, 5] as const;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// --- resilient client-side queue -------------------------------------------
// If a submit can't reach the server (bad LTE), we stash it locally and retry
// in the background. The tapper always sees the thank-you — their entry is never lost.

function readQueue(): Payload[] {
  try {
    const raw = localStorage.getItem(QUEUE_KEY);
    return raw ? (JSON.parse(raw) as Payload[]) : [];
  } catch {
    return [];
  }
}

function writeQueue(items: Payload[]) {
  try {
    localStorage.setItem(QUEUE_KEY, JSON.stringify(items));
  } catch {
    /* storage full / disabled — nothing we can do */
  }
}

// "ok" = stored · "retry" = transient, try again later · "reject" = permanent, drop
async function postSubmission(payload: Payload): Promise<"ok" | "retry" | "reject"> {
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 8000);
    const res = await fetch("/api/submit", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...payload, website: "" }),
      signal: controller.signal,
      keepalive: true,
    });
    clearTimeout(timer);
    if (res.ok) return "ok";
    if (res.status === 429 || res.status >= 500) return "retry";
    return "reject";
  } catch {
    return "retry"; // network error / timeout
  }
}

async function flushQueue() {
  const items = readQueue();
  if (items.length === 0) return;
  const remaining: Payload[] = [];
  for (const item of items) {
    if ((await postSubmission(item)) === "retry") remaining.push(item);
  }
  writeQueue(remaining);
}

// ---------------------------------------------------------------------------

export default function StokedForm({ e, b, c }: Props) {
  const [rating, setRating] = useState<number | null>(null);
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "submitting" | "done">("idle");
  const [error, setError] = useState<string | null>(null);

  const brand = b?.trim() ? b.trim() : "Campus Run";

  // Drain any queued submissions on load, when connectivity returns, and periodically.
  useEffect(() => {
    void flushQueue();
    const onOnline = () => void flushQueue();
    window.addEventListener("online", onOnline);
    const interval = setInterval(() => {
      if (readQueue().length > 0) void flushQueue();
    }, 15000);
    return () => {
      window.removeEventListener("online", onOnline);
      clearInterval(interval);
    };
  }, []);

  const submit = useCallback(
    async (ev: React.FormEvent) => {
      ev.preventDefault();
      if (status === "submitting") return;

      if (rating === null) {
        setError("Tap a number to rate first.");
        return;
      }
      const trimmed = email.trim();
      if (trimmed !== "" && !EMAIL_RE.test(trimmed)) {
        setError("That email looks off — or leave it blank.");
        return;
      }

      setError(null);
      setStatus("submitting");

      const payload: Payload = {
        rating,
        email: trimmed === "" ? null : trimmed,
        e,
        b,
        c,
      };

      const result = await postSubmission(payload);
      // Transient failure → queue it and retry in the background.
      if (result === "retry") writeQueue([...readQueue(), payload]);

      // Never trap someone on festival internet: show the thank-you regardless.
      setStatus("done");
    },
    [rating, email, e, b, c, status],
  );

  if (status === "done") {
    return (
      <main className="mx-auto flex min-h-dvh w-full max-w-md flex-col px-6 py-10">
        <Wordmark />
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
          <h1 className="font-display text-4xl font-bold text-ink">You&apos;re in.</h1>
          <p className="mt-3 text-lg text-muted">Stay stoked.</p>
        </div>
      </main>
    );
  }

  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-md flex-col px-6 py-10">
      <Wordmark />

      <form onSubmit={submit} className="flex flex-1 flex-col justify-center">
        <h1 className="font-display text-4xl font-bold leading-tight text-ink">
          How stoked are you?
        </h1>

        {/* Rating — one tap. Selected turns gold (the Gold Rule). */}
        <div className="mt-8 flex gap-2" role="group" aria-label="Rate 1 to 5">
          {RATINGS.map((n) => {
            const selected = rating === n;
            return (
              <button
                key={n}
                type="button"
                aria-label={`Rate ${n} out of 5`}
                aria-pressed={selected}
                onClick={() => {
                  setRating(n);
                  setError(null);
                }}
                className={[
                  "flex h-16 flex-1 items-center justify-center rounded-2xl border-2 text-xl font-bold transition-transform active:scale-95",
                  selected
                    ? "border-gold bg-gold text-ink-deep shadow-sm"
                    : "border-line bg-fill text-ink",
                ].join(" ")}
              >
                {n}
              </button>
            );
          })}
        </div>
        <div className="mt-2 flex justify-between px-1 text-xs text-muted">
          <span>not feeling it</span>
          <span>so stoked</span>
        </div>

        {/* Email — optional. */}
        <input
          type="email"
          inputMode="email"
          autoComplete="email"
          enterKeyHint="done"
          placeholder="you@email.com — optional"
          value={email}
          onChange={(ev) => {
            setEmail(ev.target.value);
            setError(null);
          }}
          className="mt-8 h-14 w-full rounded-2xl border-2 border-line bg-fill px-4 text-base text-ink placeholder:text-muted focus:border-ink focus:outline-none"
        />

        {error && <p className="mt-3 text-sm text-ink-deep">{error}</p>}

        {/* Submit — the one action, so it's gold. */}
        <button
          type="submit"
          disabled={status === "submitting"}
          className="mt-4 h-14 w-full rounded-2xl bg-gold font-display text-lg font-bold text-ink-deep transition-transform active:scale-[0.98] disabled:opacity-60"
        >
          {status === "submitting" ? "Saving…" : "Submit"}
        </button>

        <p className="mt-5 text-center text-xs leading-relaxed text-muted">
          Email used for {brand} / Campus Run updates only.
        </p>
      </form>
    </main>
  );
}

function Wordmark() {
  return (
    <div className="font-display text-xs font-bold uppercase tracking-[0.22em] text-ink">
      Campus Run
    </div>
  );
}
