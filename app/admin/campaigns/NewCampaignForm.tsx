"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

const SITE = (process.env.NEXT_PUBLIC_SITE_URL ?? "https://campusrun.network").replace(/\/+$/, "");

export default function NewCampaignForm() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [brand, setBrand] = useState("");
  const [event, setEvent] = useState("");
  const [card, setCard] = useState("");
  const [status, setStatus] = useState<"idle" | "submitting">("idle");
  const [error, setError] = useState<string | null>(null);

  const preview = brand && event
    ? `${SITE}/stoked?e=${encodeURIComponent(event)}&b=${encodeURIComponent(brand)}${card ? `&c=${encodeURIComponent(card)}` : ""}`
    : null;

  function reset() {
    setName(""); setBrand(""); setEvent(""); setCard(""); setError(null);
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (status === "submitting") return;
    setError(null);
    setStatus("submitting");
    const res = await fetch("/api/admin/campaigns", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, b: brand, e: event, c: card }),
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
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Campaign name" value={name} onChange={setName} placeholder="ACME Fall 2025" />
        <Field label="Brand (b)" value={brand} onChange={setBrand} placeholder="acme" mono />
        <Field label="Drop / event (e)" value={event} onChange={setEvent} placeholder="acme-fall25" mono />
        <Field label="Card # (c) — optional" value={card} onChange={setCard} placeholder="1" mono />
      </div>

      {preview && (
        <div className="mt-4 rounded-lg border border-white/10 bg-black/30 px-3 py-2">
          <div className="text-[10px] uppercase tracking-wider text-[#6B7688]">Generated link</div>
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
