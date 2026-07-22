"use client";

import { useState } from "react";

/**
 * Public brand intake. Same palette as the capture page — white, Ink text, and the
 * Gold Rule: gold appears only on a selected chip and on the one submit action.
 */

const INTERESTS = [
  "NFC card drops",
  "Campus activation",
  "Event sponsorship",
  "Product sampling",
  "Brand ambassadors",
  "Content / UGC",
  "Not sure yet",
] as const;

const TIMELINES = ["ASAP", "1–3 months", "3–6 months", "Just exploring"] as const;

const BUDGETS = ["Under $5k", "$5k–$15k", "$15k–$50k", "$50k+", "Not sure yet"] as const;

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

type Errors = Partial<Record<"company" | "contactName" | "email", string>>;

export default function IntakeForm() {
  const [company, setCompany] = useState("");
  const [website, setWebsite] = useState("");
  const [contactName, setContactName] = useState("");
  const [role, setRole] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [interests, setInterests] = useState<string[]>([]);
  const [campuses, setCampuses] = useState("");
  const [timeline, setTimeline] = useState("");
  const [budget, setBudget] = useState("");
  const [message, setMessage] = useState("");
  const [heardFrom, setHeardFrom] = useState("");
  const [honeypot, setHoneypot] = useState("");

  const [errors, setErrors] = useState<Errors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [status, setStatus] = useState<"idle" | "submitting" | "done">("idle");

  function toggleInterest(value: string) {
    setInterests((prev) =>
      prev.includes(value) ? prev.filter((v) => v !== value) : [...prev, value],
    );
  }

  async function submit(ev: React.FormEvent) {
    ev.preventDefault();
    if (status === "submitting") return;

    const next: Errors = {};
    if (!company.trim()) next.company = "Required";
    if (!contactName.trim()) next.contactName = "Required";
    if (!email.trim()) next.email = "Required";
    else if (!EMAIL_RE.test(email.trim())) next.email = "That email looks off";
    setErrors(next);
    if (Object.keys(next).length > 0) {
      setFormError("Fill in the highlighted fields.");
      return;
    }

    setFormError(null);
    setStatus("submitting");

    try {
      const res = await fetch("/api/leads", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          company,
          contactName,
          email,
          role,
          phone,
          website,
          interests,
          campuses,
          timeline,
          budget,
          message,
          heardFrom,
          website2: honeypot,
        }),
      });
      if (!res.ok) throw new Error(String(res.status));
      setStatus("done");
    } catch {
      setStatus("idle");
      setFormError("That didn't send. Check your connection and try again.");
    }
  }

  if (status === "done") {
    return (
      <main className="mx-auto flex min-h-dvh w-full max-w-xl flex-col px-6 py-10">
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
          <h1 className="font-display text-4xl font-bold text-ink">Got it.</h1>
          <p className="mt-3 max-w-sm text-lg text-muted">
            We&apos;ll get back to you at {email.trim()} within a couple of days.
          </p>
        </div>
      </main>
    );
  }

  return (
    <main className="mx-auto w-full max-w-xl px-6 py-10">
      <Wordmark />

      <header className="mt-8">
        <h1 className="font-display text-4xl font-bold leading-tight text-ink">
          Let&apos;s run your brand on campus.
        </h1>
        <p className="mt-3 text-base leading-relaxed text-muted">
          Tell us what you&apos;re building and we&apos;ll come back with a plan. Takes about a
          minute.
        </p>
      </header>

      <form onSubmit={submit} className="mt-10" noValidate>
        <Section title="About you">
          <Field
            label="Company"
            required
            value={company}
            onChange={setCompany}
            placeholder="Red Bull"
            error={errors.company}
            autoComplete="organization"
          />
          <Field
            label="Website"
            value={website}
            onChange={setWebsite}
            placeholder="redbull.com"
            inputMode="url"
            autoComplete="url"
          />
          <Field
            label="Your name"
            required
            value={contactName}
            onChange={setContactName}
            placeholder="Alex Rivera"
            error={errors.contactName}
            autoComplete="name"
          />
          <Field
            label="Role"
            value={role}
            onChange={setRole}
            placeholder="Brand Marketing Manager"
            autoComplete="organization-title"
          />
          <Field
            label="Email"
            required
            type="email"
            value={email}
            onChange={setEmail}
            placeholder="alex@redbull.com"
            error={errors.email}
            inputMode="email"
            autoComplete="email"
          />
          <Field
            label="Phone"
            value={phone}
            onChange={setPhone}
            placeholder="Optional"
            type="tel"
            inputMode="tel"
            autoComplete="tel"
          />
        </Section>

        <Section title="What you're after">
          <ChipGroup
            label="I'm interested in"
            options={[...INTERESTS]}
            selected={interests}
            onToggle={toggleInterest}
            multi
          />
          <Field
            label="Campuses or markets"
            value={campuses}
            onChange={setCampuses}
            placeholder="ASU, UT Austin, Southeast schools…"
            full
          />
          <ChipGroup
            label="Timeline"
            options={[...TIMELINES]}
            selected={timeline ? [timeline] : []}
            onToggle={(v) => setTimeline((cur) => (cur === v ? "" : v))}
          />
          <ChipGroup
            label="Budget"
            options={[...BUDGETS]}
            selected={budget ? [budget] : []}
            onToggle={(v) => setBudget((cur) => (cur === v ? "" : v))}
          />
        </Section>

        <Section title="Anything else">
          <label className="col-span-full block">
            <span className="mb-1.5 block text-sm font-medium text-ink">
              Tell us about it
            </span>
            <textarea
              value={message}
              onChange={(ev) => setMessage(ev.target.value)}
              rows={5}
              placeholder="Goals, product, dates, anything you already have in mind."
              className="w-full resize-y rounded-2xl border-2 border-line bg-fill px-4 py-3 text-base leading-relaxed text-ink placeholder:text-muted focus:border-ink focus:outline-none"
            />
          </label>
          <Field
            label="How'd you hear about us"
            value={heardFrom}
            onChange={setHeardFrom}
            placeholder="Optional"
            full
          />
        </Section>

        {/* Honeypot — hidden from real users, catnip for bots. */}
        <input
          type="text"
          name="website2"
          tabIndex={-1}
          autoComplete="off"
          aria-hidden="true"
          value={honeypot}
          onChange={(ev) => setHoneypot(ev.target.value)}
          className="absolute left-[-9999px] h-0 w-0 opacity-0"
        />

        {formError && <p className="mt-6 text-sm font-medium text-ink-deep">{formError}</p>}

        {/* The one action, so it's gold. */}
        <button
          type="submit"
          disabled={status === "submitting"}
          className="mt-6 h-14 w-full rounded-2xl bg-gold font-display text-lg font-bold text-ink-deep transition-transform active:scale-[0.98] disabled:opacity-60"
        >
          {status === "submitting" ? "Sending…" : "Send it"}
        </button>

        <p className="mt-5 text-center text-xs leading-relaxed text-muted">
          We only use this to reply to you. No lists, no spam.
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

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mb-9">
      <h2 className="mb-4 text-xs font-bold uppercase tracking-[0.18em] text-muted">{title}</h2>
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">{children}</div>
    </section>
  );
}

function Field({
  label,
  value,
  onChange,
  placeholder,
  required,
  error,
  type = "text",
  inputMode,
  autoComplete,
  full,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  required?: boolean;
  error?: string;
  type?: string;
  inputMode?: "text" | "email" | "tel" | "url";
  autoComplete?: string;
  full?: boolean;
}) {
  return (
    <label className={`block ${full ? "sm:col-span-2" : ""}`}>
      <span className="mb-1.5 block text-sm font-medium text-ink">
        {label}
        {required && <span className="text-muted"> *</span>}
        {error && <span className="ml-2 text-xs font-semibold text-ink-deep">{error}</span>}
      </span>
      <input
        type={type}
        value={value}
        onChange={(ev) => onChange(ev.target.value)}
        placeholder={placeholder}
        inputMode={inputMode}
        autoComplete={autoComplete}
        className={`h-14 w-full rounded-2xl border-2 bg-fill px-4 text-base text-ink placeholder:text-muted focus:outline-none ${
          error ? "border-ink-deep" : "border-line focus:border-ink"
        }`}
      />
    </label>
  );
}

function ChipGroup({
  label,
  options,
  selected,
  onToggle,
  multi,
}: {
  label: string;
  options: string[];
  selected: string[];
  onToggle: (v: string) => void;
  multi?: boolean;
}) {
  return (
    <div className="sm:col-span-2">
      <span className="mb-2.5 block text-sm font-medium text-ink">
        {label}
        {multi && <span className="ml-2 text-xs text-muted">pick any</span>}
      </span>
      <div className="flex flex-wrap gap-2" role="group" aria-label={label}>
        {options.map((opt) => {
          const on = selected.includes(opt);
          return (
            <button
              key={opt}
              type="button"
              aria-pressed={on}
              onClick={() => onToggle(opt)}
              className={`rounded-full border-2 px-4 py-2.5 text-sm font-medium transition-transform active:scale-95 ${
                on ? "border-gold bg-gold text-ink-deep" : "border-line bg-fill text-ink"
              }`}
            >
              {opt}
            </button>
          );
        })}
      </div>
    </div>
  );
}
