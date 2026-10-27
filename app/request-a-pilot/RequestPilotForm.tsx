"use client";

import { useState } from "react";
import Link from "next/link";

/**
 * "Book a call" — a centered white card on an ink radial backdrop.
 *
 * The form's job is to let Kasey see the job before the call: who they are, who
 * staffs the booth, what they tracked last time, whether a store will scan.
 * It posts to the existing /api/leads endpoint (no backend change). Answers map
 * onto leads columns the admin table and the notification email already show —
 *   Name                 → contactName
 *   Work email           → email
 *   Phone                → phone
 *   Brand or agency      → company     (required: the leads.company column is NOT NULL)
 *   Website              → website
 *   You are              → role
 *   Next sampling day    → timeline
 *   Campus or city       → campuses
 *   Staffing, tracked last time, redeem partner, anything else
 *                        → message, one labelled line each
 *   interests            → [] (not used by this form)
 *
 * Gold Rule holds: the only gold here is the success checkmark's tint. The submit
 * action is ink, not gold.
 */

const ROLE = ["A brand", "An agency", "A field or staffing team", "Something else"] as const;
const STAFFING = [
  "Our own field team",
  "An agency or staffing partner",
  "Student ambassadors",
  "Not decided yet",
] as const;
const TRACKED = [
  "Samples handed out",
  "Foot traffic or impressions",
  "Sign-ups or opt-ins",
  "Coupon redemptions",
  "Nothing formal",
] as const;
const REDEEM = ["Yes, a store or retailer will scan", "No", "Not sure"] as const;

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const ERROR = "#b21e15"; // --error-deep

export default function RequestPilotForm() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [brand, setBrand] = useState("");
  const [website, setWebsite] = useState("");
  const [website2, setWebsite2] = useState(""); // honeypot
  const [role, setRole] = useState("");
  const [staffing, setStaffing] = useState("");
  const [tracked, setTracked] = useState<Record<string, boolean>>({});
  const [redeem, setRedeem] = useState("");
  const [nextDay, setNextDay] = useState("");
  const [where, setWhere] = useState("");
  const [notes, setNotes] = useState("");

  const [error, setError] = useState("");
  const [status, setStatus] = useState<"idle" | "submitting" | "done">("idle");

  function toggleTracked(opt: string) {
    setTracked((t) => ({ ...t, [opt]: !t[opt] }));
  }

  async function submit(ev: React.FormEvent) {
    ev.preventDefault();
    if (status === "submitting") return;

    if (!name.trim() || !email.trim()) {
      setError("Please add your name and work email.");
      return;
    }
    if (!EMAIL_RE.test(email.trim())) {
      setError("That email looks off — mind checking it?");
      return;
    }
    if (!brand.trim()) {
      setError("Please add the brand or agency this is for.");
      return;
    }
    setError("");
    setStatus("submitting");

    // The qualifying answers travel in `message`, one labelled line each, so they
    // show in the admin table and the notification email with no schema change.
    const trackedList = TRACKED.filter((o) => tracked[o]);
    const message = [
      staffing && `Staffing: ${staffing}`,
      trackedList.length > 0 && `Tracked last time: ${trackedList.join(", ")}`,
      redeem && `Redeem partner: ${redeem}`,
      notes.trim() && `Notes: ${notes.trim()}`,
    ]
      .filter(Boolean)
      .join("\n");

    try {
      const res = await fetch("/api/leads", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contactName: name,
          email,
          phone,
          company: brand,
          website,
          role,
          timeline: nextDay,
          campuses: where,
          interests: [],
          message,
          website2,
        }),
      });
      if (!res.ok) throw new Error(String(res.status));
      setStatus("done");
    } catch {
      setStatus("idle");
      setError("That didn't send. Check your connection and try again.");
    }
  }

  return (
    <main
      className="flex min-h-dvh items-start justify-center px-5 py-14"
      style={{
        background:
          "radial-gradient(1200px 700px at 70% -10%, #0a4a6e 0%, #003B5C 55%, #002942 100%)",
      }}
    >
      <div
        className="relative w-full max-w-[620px] rounded-2xl bg-white px-6 pb-10 pt-11 sm:px-12"
        style={{ boxShadow: "0 40px 90px rgba(0,20,32,.5)" }}
      >
        <Link
          href="/"
          aria-label="Close"
          className="absolute right-6 top-[22px] flex h-8 w-8 items-center justify-center rounded-full text-muted hover:bg-fill hover:text-ink"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M18 6 6 18M6 6l12 12" />
          </svg>
        </Link>

        {status === "done" ? (
          <div className="px-1 py-6 text-center">
            <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-full" style={{ background: "rgba(255,204,0,.2)" }}>
              <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="var(--color-ink)" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M20 6 9 17l-5-5" />
              </svg>
            </div>
            <h1 className="m-0 font-display text-[26px] font-bold tracking-[-0.02em] text-ink">
              Got it.
            </h1>
            <p className="mx-auto mb-6 mt-2 max-w-[30em] text-[15px] leading-[1.55] text-muted">
              Kasey will email you within two business days to set up a call.
            </p>
            <Link
              href="/"
              className="inline-block rounded-full bg-ink px-6 py-3 text-[15px] font-semibold text-white"
            >
              Back to home
            </Link>
          </div>
        ) : (
          <form onSubmit={submit} noValidate>
            <div className="mb-1.5 flex items-center gap-[9px]">
              <span className="inline-block h-[11px] w-[11px] rounded-[2px] bg-ink" />
              <span className="font-display text-[15px] font-bold tracking-[-0.02em] text-ink">
                Campus Run
              </span>
            </div>
            <h1 className="m-0 font-display text-[30px] font-bold tracking-[-0.02em] text-ink">
              Tell us about your next sampling day
            </h1>
            <p className="mb-7 mt-1.5 text-[15px] leading-[1.5] text-muted">
              Kasey reads these and emails back within two business days to set up a
              call. The day gets scoped on the call, not from this form.
            </p>

            <div className="flex flex-col gap-[18px]">
              <Field label="Name" required value={name} onChange={setName} autoComplete="name" />
              <Field label="Work email" required type="email" value={email} onChange={setEmail} inputMode="email" autoComplete="email" />
              <Field label="Phone" optional value={phone} onChange={setPhone} type="tel" inputMode="tel" autoComplete="tel" />
              <Field label="Brand or agency" required value={brand} onChange={setBrand} autoComplete="organization" />
              <Field label="Website" optional value={website} onChange={setWebsite} inputMode="url" autoComplete="url" />

              <Choices legend="You are" options={ROLE} value={role} onChange={setRole} />
              <Choices legend="Who staffs the booth" options={STAFFING} value={staffing} onChange={setStaffing} />

              <div>
                <span className="mb-3 block text-[14px] font-semibold text-ink">
                  What you tracked last time
                  <span className="font-normal text-[#86868B]"> (pick any)</span>
                </span>
                <div className="grid grid-cols-1 gap-x-5 gap-y-2.5 sm:grid-cols-2">
                  {TRACKED.map((opt) => (
                    <Checkbox key={opt} label={opt} checked={!!tracked[opt]} onToggle={() => toggleTracked(opt)} />
                  ))}
                </div>
              </div>

              <Choices
                legend="Is there a redeem partner?"
                hint="A store or retailer that will scan a coupon barcode at the register."
                options={REDEEM}
                value={redeem}
                onChange={setRedeem}
              />

              <Field label="Next sampling day" optional value={nextDay} onChange={setNextDay} placeholder="Nov 12, or not scheduled yet" maxLength={80} />
              <Field label="Campus or city" optional value={where} onChange={setWhere} maxLength={500} />

              <label className="block">
                <span className="mb-2 block text-[14px] font-semibold text-ink">
                  Anything else
                  <span className="font-normal text-[#86868B]"> (optional)</span>
                </span>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={3}
                  maxLength={4000}
                  className="w-full rounded-lg border border-line bg-white px-3.5 py-3 text-[15px] text-ink placeholder:text-muted focus:border-ink focus:outline-none"
                />
              </label>

              {error && (
                <div className="-mt-1 text-[13px]" style={{ color: ERROR }}>
                  {error}
                </div>
              )}

              {/* Honeypot — hidden from real users. */}
              <input
                type="text"
                name="website2"
                tabIndex={-1}
                autoComplete="off"
                aria-hidden="true"
                value={website2}
                onChange={(e) => setWebsite2(e.target.value)}
                className="absolute left-[-9999px] h-0 w-0 opacity-0"
              />

              <button
                type="submit"
                disabled={status === "submitting"}
                className="mt-1.5 w-full rounded-lg bg-ink py-[15px] text-[15px] font-semibold text-white transition-colors hover:bg-ink-deep disabled:opacity-60"
              >
                {status === "submitting" ? "Sending…" : "Book a call"}
              </button>
            </div>
          </form>
        )}
      </div>
    </main>
  );
}

function Field({
  label,
  value,
  onChange,
  required,
  optional,
  type = "text",
  inputMode,
  autoComplete,
  placeholder,
  maxLength,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  required?: boolean;
  optional?: boolean;
  type?: string;
  inputMode?: "text" | "email" | "tel" | "url";
  autoComplete?: string;
  placeholder?: string;
  maxLength?: number;
}) {
  return (
    <label className="block">
      <span className="mb-2 block text-[14px] font-semibold text-ink">
        {label}
        {optional && <span className="font-normal text-[#86868B]"> (optional)</span>}
      </span>
      <input
        type={type}
        required={required}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        inputMode={inputMode}
        autoComplete={autoComplete}
        placeholder={placeholder}
        maxLength={maxLength}
        className="w-full rounded-lg border border-line bg-white px-3.5 py-3 text-[15px] text-ink placeholder:text-muted focus:border-ink focus:outline-none"
      />
    </label>
  );
}

/** A one-answer question: radios drawn in the same style as the checkboxes. */
function Choices({
  legend,
  hint,
  options,
  value,
  onChange,
}: {
  legend: string;
  hint?: string;
  options: readonly string[];
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <fieldset className="m-0 min-w-0 border-0 p-0">
      <legend className="block text-[14px] font-semibold text-ink">{legend}</legend>
      {hint && <p className="mb-0 mt-1 text-[13px] text-muted">{hint}</p>}
      <div className="mt-3 grid grid-cols-1 gap-x-5 gap-y-2.5 sm:grid-cols-2">
        {options.map((opt) => {
          const on = value === opt;
          return (
            <label key={opt} className="flex cursor-pointer items-center gap-[11px] py-1">
              <input
                type="radio"
                name={legend}
                className="sr-only"
                checked={on}
                onChange={() => onChange(opt)}
              />
              <span
                className="flex h-5 w-5 flex-none items-center justify-center rounded-full transition-all"
                style={{ border: on ? "1.5px solid var(--color-ink)" : "1.5px solid #D2D2D7", background: "#fff" }}
              >
                {on && <span className="h-2.5 w-2.5 rounded-full bg-ink" />}
              </span>
              <span className="text-[15px] text-ink">{opt}</span>
            </label>
          );
        })}
      </div>
    </fieldset>
  );
}

function Checkbox({
  label,
  checked,
  onToggle,
}: {
  label: string;
  checked: boolean;
  onToggle: () => void;
}) {
  return (
    <label className="flex cursor-pointer items-center gap-[11px] py-1">
      <input type="checkbox" className="sr-only" checked={checked} onChange={onToggle} />
      <span
        className="flex h-5 w-5 flex-none items-center justify-center rounded-[5px] transition-all"
        style={{
          border: checked ? "1.5px solid var(--color-ink)" : "1.5px solid #D2D2D7",
          background: checked ? "var(--color-ink)" : "#fff",
        }}
      >
        {checked && (
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M20 6 9 17l-5-5" />
          </svg>
        )}
      </span>
      <span className="text-[15px] text-ink">{label}</span>
    </label>
  );
}
