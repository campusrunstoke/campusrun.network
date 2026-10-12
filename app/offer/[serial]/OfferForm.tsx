"use client";

import { useState } from "react";

/**
 * The optional part of the offer page: one question and, if the campaign wants it, a
 * phone number with a separate (unticked) opt-in to future texts. The offer above never
 * depends on any of this.
 */
export default function OfferForm({
  serial,
  preview,
  question,
  askPhone,
  consent,
  alreadyAnswered,
}: {
  serial: string;
  preview: boolean;
  question: string | null;
  askPhone: boolean;
  consent: string;
  alreadyAnswered: boolean;
}) {
  const [answer, setAnswer] = useState("");
  const [phone, setPhone] = useState("");
  const [optIn, setOptIn] = useState(false);
  const [status, setStatus] = useState<"idle" | "sending" | "done">(alreadyAnswered ? "done" : "idle");
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!answer.trim() && !phone.trim()) return setError(question ? "Type an answer first." : "Add your number first.");
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
      return setError(json.error ?? "Something went wrong — try again.");
    }
    setStatus("done");
  }

  if (status === "done") {
    return (
      <div className="mt-8 rounded-2xl bg-fill p-5 text-center">
        <div className="font-display text-lg font-bold text-ink">Thanks — got it.</div>
        <p className="mt-1 text-sm text-muted">Enjoy your offer.</p>
      </div>
    );
  }

  const input = "h-12 w-full rounded-xl border border-line bg-white px-4 text-base text-ink outline-none placeholder:text-muted/70 focus:border-ink/50";
  return (
    <form onSubmit={submit} className="mt-8 grid gap-4">
      {question && (
        <label className="block">
          <span className="mb-1.5 block font-display text-lg font-bold text-ink">{question}</span>
          <input id="offer-answer" value={answer} onChange={(e) => setAnswer(e.target.value)} placeholder="Type anything" maxLength={300} className={input} />
        </label>
      )}
      {askPhone && (
        <>
          <label className="block">
            <span className="mb-1.5 block text-sm font-semibold text-ink">Your phone number <span className="font-normal text-muted">(optional)</span></span>
            <input id="offer-phone" type="tel" inputMode="tel" autoComplete="tel" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="(310) 555-0123" className={input} />
          </label>
          <label className="flex cursor-pointer items-start gap-3">
            <input id="offer-optin" type="checkbox" checked={optIn} onChange={(e) => setOptIn(e.target.checked)} className="mt-1 h-5 w-5 shrink-0 accent-[#003b5c]" />
            <span className="text-xs leading-relaxed text-muted">{consent}</span>
          </label>
        </>
      )}
      {error && <p className="text-sm text-red-700">{error}</p>}
      <button type="submit" disabled={status === "sending"} className="h-12 rounded-2xl bg-ink font-display text-base font-bold text-white disabled:opacity-60">
        {status === "sending" ? "Sending…" : "Send"}
      </button>
    </form>
  );
}
