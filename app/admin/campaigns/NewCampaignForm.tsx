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
        className="mb-6 inline-flex h-10 items-center gap-2 rounded-xl bg-[#FFCC00] px-4 font-display text-sm font-bold text-[#0A1420] transition-colors hover:bg-[#FFD633]"
      >
        <span className="text-lg leading-none">+</span> New campaign
      </button>
    );
  }

  return (
    <form
      onSubmit={submit}
      className="mb-6 rounded-2xl border border-white/10 bg-white/[0.03] p-5 backdrop-blur-sm"
    >
      {/* redirect toggle: off = rating page, on = bounce to the client's site */}
      <label className="mb-4 flex cursor-pointer items-center justify-between gap-3 rounded-xl border border-white/10 bg-white/[0.02] p-3.5">
        <div className="min-w-0">
          <div className="text-sm font-semibold text-white">Redirect to a website</div>
          <div className="mt-0.5 text-[11px] leading-snug text-[#9AA6B8]">
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
        </div>
      )}

      {preview && (
        <div className="mt-4 rounded-lg border border-white/10 bg-black/30 px-3 py-2">
          <div className="text-[10px] uppercase tracking-wider text-[#6B7688]">
            NFC link {type === "redirect" && "· then → " + (dest || "destination")}
          </div>
          <code className="break-all text-xs text-[#7DE3FF]">{preview}</code>
        </div>
      )}

      {error && <p className="mt-3 text-sm text-red-300">{error}</p>}

      <div className="mt-4 flex gap-2">
        <button
          type="submit"
          disabled={status === "submitting"}
          className="h-9 rounded-lg bg-[#FFCC00] px-4 text-sm font-bold text-[#0A1420] transition-colors hover:bg-[#FFD633] disabled:opacity-60"
        >
          {status === "submitting" ? "Creating…" : "Create campaign"}
        </button>
        <button
          type="button"
          onClick={() => { setOpen(false); reset(); }}
          className="h-9 rounded-lg border border-white/10 px-4 text-sm text-[#9AA6B8] hover:text-white"
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
        on ? "bg-[#FFCC00]" : "bg-white/15"
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
      <span className="mb-1.5 block text-xs font-medium text-[#9AA6B8]">{label}</span>
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className={`h-10 w-full rounded-lg border border-white/10 bg-white/5 px-3 text-sm text-white outline-none transition-colors placeholder:text-[#5A6577] focus:border-[#FFCC00]/50 ${mono ? "font-mono" : ""}`}
      />
    </label>
  );
}
