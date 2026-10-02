"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

const SITE = (process.env.NEXT_PUBLIC_SITE_URL ?? "https://campusrun.network").replace(/\/+$/, "");

type CampaignType = "rating" | "redirect";

export default function NewCampaignForm() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [type, setType] = useState<CampaignType>("rating");
  const [name, setName] = useState("");
  const [brand, setBrand] = useState("");
  const [event, setEvent] = useState("");
  const [card, setCard] = useState("");
  const [dest, setDest] = useState("");
  const [status, setStatus] = useState<"idle" | "submitting">("idle");
  const [error, setError] = useState<string | null>(null);

  const path = type === "redirect" ? "go" : "stoked";
  const preview =
    brand && event
      ? `${SITE}/${path}?e=${encodeURIComponent(event)}&b=${encodeURIComponent(brand)}${card ? `&c=${encodeURIComponent(card)}` : ""}`
      : null;

  function reset() {
    setType("rating"); setName(""); setBrand(""); setEvent(""); setCard(""); setDest(""); setError(null);
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (status === "submitting") return;
    setError(null);
    setStatus("submitting");
    const res = await fetch("/api/admin/campaigns", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, type, destinationUrl: dest, b: brand, e: event, c: card }),
    });
    if (res.ok) {
      reset();
      setOpen(false);
      setStatus("idle");
      router.refresh();
    } else {
      const data = await res.json().catch(() => ({}));
      setError(data.error ?? "Could not create campaign.");
      setStatus("idle");
    }
  }

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="mb-6 inline-flex h-10 items-center gap-2 rounded-xl bg-gold px-4 font-display text-sm font-bold text-ink-deep transition-colors hover:bg-gold-deep"
      >
        <span className="text-lg leading-none">+</span> New campaign
      </button>
    );
  }

  return (
    <form
      onSubmit={submit}
      className="mb-6 rounded-2xl border border-line bg-white p-5 backdrop-blur-sm"
    >
      {/* redirect toggle: off = rating page, on = bounce to the client's site */}
      <label className="mb-4 flex cursor-pointer items-center justify-between gap-3 rounded-xl border border-line bg-white p-3.5">
        <div className="min-w-0">
          <div className="text-sm font-semibold text-ink">Redirect to a website</div>
          <div className="mt-0.5 text-[11px] leading-snug text-muted">
            Off = stoked rating page. On = count the tap, then send them to the client&apos;s URL.
          </div>
        </div>
        <Toggle on={type === "redirect"} onChange={(v) => setType(v ? "redirect" : "rating")} />
      </label>

      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Campaign name" value={name} onChange={setName} placeholder="Red Bull Summer 2025" />
        <Field label="Brand (b)" value={brand} onChange={setBrand} placeholder="redbull" mono />
        <Field label="Drop / event (e)" value={event} onChange={setEvent} placeholder="summer25" mono />
        <Field label="Card # (c) — optional" value={card} onChange={setCard} placeholder="1" mono />
      </div>

      {type === "redirect" && (
        <div className="mt-4">
          <Field
            label="Destination URL"
            value={dest}
            onChange={setDest}
            placeholder="https://www.redbull.com"
          />
          <p className="mt-1.5 text-[11px] leading-snug text-muted">
            Each tap auto-appends utm_source/medium/campaign + a unique cr_cid before
            redirecting. Any utm_ params you bake into the URL here are kept.
          </p>
        </div>
      )}

      {preview && (
        <div className="mt-4 rounded-lg border border-line bg-fill px-3 py-2">
          <div className="text-[10px] uppercase tracking-wider text-muted">
            NFC link {type === "redirect" && "· then → " + (dest || "destination")}
          </div>
          <code className="break-all text-xs text-ink/70">{preview}</code>
        </div>
      )}

      {error && <p className="mt-3 text-sm text-red-300">{error}</p>}

      <div className="mt-4 flex gap-2">
        <button
          type="submit"
          disabled={status === "submitting"}
          className="h-9 rounded-lg bg-gold px-4 text-sm font-bold text-ink-deep transition-colors hover:bg-gold-deep disabled:opacity-60"
        >
          {status === "submitting" ? "Creating…" : "Create campaign"}
        </button>
        <button
          type="button"
          onClick={() => { setOpen(false); reset(); }}
          className="h-9 rounded-lg border border-line px-4 text-sm text-muted hover:text-ink"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}

function Toggle({ on, onChange }: { on: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={on}
      onClick={() => onChange(!on)}
      className={`relative h-6 w-11 shrink-0 rounded-full transition-colors ${
        on ? "bg-gold" : "bg-line"
      }`}
    >
      <span
        className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform ${
          on ? "translate-x-[22px]" : "translate-x-0.5"
        }`}
      />
    </button>
  );
}

function Field({
  label,
  value,
  onChange,
  placeholder,
  mono,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  mono?: boolean;
}) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-xs font-medium text-muted">{label}</span>
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className={`h-10 w-full rounded-lg border border-line bg-white px-3 text-sm text-ink outline-none transition-colors placeholder:text-muted/70 focus:border-ink/40 ${mono ? "font-mono" : ""}`}
      />
    </label>
  );
}
