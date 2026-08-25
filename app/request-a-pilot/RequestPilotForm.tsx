"use client";

import { useState } from "react";
import Link from "next/link";

/**
 * "Request a pilot" — a centered white modal card on an ink radial backdrop.
 *
 * Posts to the existing /api/leads endpoint (no backend change): the design's
 * fields map straight onto the leads schema —
 *   Name              → contactName
 *   Work email        → email
 *   Phone             → phone
 *   Brand or org      → company           (required: the leads.company column is NOT NULL)
 *   Website           → website
 *   activation chips  → interests[]       (already a text[] column)
 *   "if other" text   → message
 *
 * Gold Rule holds: the only gold here is the success checkmark's tint. The submit
 * action is ink (the design's choice), not gold.
 */

const OPTIONS = [
  "Product sampling",
  "Brand launch",
  "Festival or event",
  "Campus activation",
  "Mentorship program",
  "Other",
] as const;

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const ERROR = "#b21e15"; // --error-deep

export default function RequestPilotForm() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [brand, setBrand] = useState("");
  const [website, setWebsite] = useState("");
  const [website2, setWebsite2] = useState(""); // honeypot
  const [checked, setChecked] = useState<Record<string, boolean>>({});
  const [other, setOther] = useState("");

  const [error, setError] = useState("");
  const [status, setStatus] = useState<"idle" | "submitting" | "done">("idle");

  function toggle(opt: string) {
    setChecked((c) => ({ ...c, [opt]: !c[opt] }));
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
      setError("Please add the brand or organization this is for.");
      return;
    }
    setError("");
    setStatus("submitting");

    const interests = OPTIONS.filter((o) => checked[o]);
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
          interests,
          message: other,
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
              You&rsquo;re on the list.
            </h1>
            <p className="mx-auto mb-6 mt-2 max-w-[30em] text-[15px] leading-[1.55] text-muted">
              We&rsquo;ll reach out within two business days to find the fit and set up
              your first pilot.
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
              Request a pilot
            </h1>
            <p className="mb-7 mt-1.5 text-[15px] leading-[1.5] text-muted">
              Tell us about the activation. We&rsquo;ll find the fit and run one, low
              risk, so the numbers speak for themselves.
            </p>

            <div className="flex flex-col gap-[18px]">
              <Field label="Name" required value={name} onChange={setName} autoComplete="name" />
              <Field label="Work email" required type="email" value={email} onChange={setEmail} inputMode="email" autoComplete="email" />
              <Field label="Phone" optional value={phone} onChange={setPhone} type="tel" inputMode="tel" autoComplete="tel" />
              <Field label="Brand or organization" required value={brand} onChange={setBrand} autoComplete="organization" />
              <Field label="Website" optional value={website} onChange={setWebsite} inputMode="url" autoComplete="url" />

              <div>
                <span className="mb-3 block text-[14px] font-semibold text-ink">
                  What are you activating?
                </span>
                <div className="grid grid-cols-1 gap-x-5 gap-y-2.5 sm:grid-cols-2">
                  {OPTIONS.map((opt) => (
                    <Checkbox key={opt} label={opt} checked={!!checked[opt]} onToggle={() => toggle(opt)} />
                  ))}
                </div>
                <input
                  value={other}
                  onChange={(e) => setOther(e.target.value)}
                  placeholder="If other, please specify"
                  className="mt-3.5 w-full rounded-lg border border-line bg-white px-3.5 py-3 text-[15px] text-ink placeholder:text-muted focus:border-ink focus:outline-none"
                />
              </div>

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
                {status === "submitting" ? "Sending…" : "Request a pilot"}
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
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  required?: boolean;
  optional?: boolean;
  type?: string;
  inputMode?: "text" | "email" | "tel" | "url";
  autoComplete?: string;
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
        className="w-full rounded-lg border border-line bg-white px-3.5 py-3 text-[15px] text-ink placeholder:text-muted focus:border-ink focus:outline-none"
      />
    </label>
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
