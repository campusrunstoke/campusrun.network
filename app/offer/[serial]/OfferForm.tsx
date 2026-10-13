"use client";

import { useState } from "react";

/**
 * The form part of the offer page: an optional question and, if the campaign wants it, a
 * phone number with a separate (unticked) opt-in to future texts. Phone-first: big tap
 * targets, a numeric keypad, and 16px+ text so iOS never zooms the page on focus.
 */
export default function OfferForm({
  serial,
  preview,
  question,
  askPhone,
  consent,
  buttonLabel,
  alreadyAnswered,
  brand,
}: {
  serial: string;
  preview: boolean;
  question: string | null;
  askPhone: boolean;
  consent: string;
  buttonLabel: string | null;
  alreadyAnswered: boolean;
  brand: { bg: string } | null; // set on brand-styled pages: the form sits on a white card
}) {
  const [answer, setAnswer] = useState("");
  const [phone, setPhone] = useState("");
  const [optIn, setOptIn] = useState(false);
  const [status, setStatus] = useState<"idle" | "sending" | "done">(alreadyAnswered ? "done" : "idle");
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!answer.trim() && !phone.trim()) return setError(askPhone ? "Add your phone number first." : "Type an answer first.");
    if (optIn && !phone.trim()) return setError("Add your number to get texts, or untick the box.");
    if (preview) return setStatus("done");
    setStatus("sending");
    const res = await fetch(`/api/offer/${serial}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ answer, phone, smsOptIn: optIn }),
    });
    const json = await res.json().catch(() => ({}));
    if (!res.ok) {
      setStatus("idle");
      return setError(json.error ?? "Something went wrong. Try again.");
    }
    setStatus("done");
  }

  const card = brand ? "rounded-[26px] bg-white p-5 text-ink shadow-[0_12px_40px_rgba(0,0,0,.25)]" : "";
  const buttonStyle = brand ? { background: brand.bg } : undefined;

  if (status === "done") {
    return (
      <div className={brand ? card : "rounded-2xl bg-fill p-5"}>
        <div className="text-center">
          <div className="font-display text-xl font-bold text-ink">You&apos;re all set.</div>
          <p className="mt-1 text-[15px] text-muted">Thanks! Stay cool.</p>
        </div>
      </div>
    );
  }

  const input =
    "h-14 w-full rounded-2xl border border-line bg-white px-4 text-[17px] text-ink outline-none placeholder:text-muted/60 focus:border-ink/60 focus:ring-2 focus:ring-ink/10";
  return (
    <form onSubmit={submit} className={`grid gap-4 ${card}`}>
      {question && (
        <label className="block">
          <span className="mb-2 block font-display text-lg font-bold text-ink">{question}</span>
          <input id="offer-answer" value={answer} onChange={(e) => setAnswer(e.target.value)} placeholder="Type anything" maxLength={300} className={input} />
        </label>
      )}
      {askPhone && (
        <>
          <label className="block">
            <span className="mb-2 block font-display text-lg font-bold text-ink">Your phone number</span>
            <input
              id="offer-phone"
              type="tel"
              inputMode="tel"
              autoComplete="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="(310) 555-0123"
              className={input}
            />
          </label>
          <label className="flex cursor-pointer items-start gap-3 rounded-2xl bg-fill p-3">
            <input
              id="offer-optin"
              type="checkbox"
              checked={optIn}
              onChange={(e) => setOptIn(e.target.checked)}
              className="mt-0.5 h-6 w-6 shrink-0 accent-[#003b5c]"
            />
            <span className="text-[13px] leading-relaxed text-muted">{consent}</span>
          </label>
        </>
      )}
      {error && <p className="text-[15px] font-medium text-red-700">{error}</p>}
      <button
        type="submit"
        disabled={status === "sending"}
        style={buttonStyle}
        className="h-14 rounded-2xl bg-ink font-display text-[17px] font-bold text-white transition-transform active:scale-[0.98] disabled:opacity-60"
      >
        {status === "sending" ? "Sending…" : buttonLabel || "Send"}
      </button>
    </form>
  );
}
