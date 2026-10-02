"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

/**
 * Step one of a campaign: just who it's for. Design, links and cards each have their
 * own place afterwards (designer, then the campaign's Cards section), so this stays a
 * ten-second form — and lands you straight in the designer.
 */
export default function NewWalletCampaignForm() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [brand, setBrand] = useState("");
  const [name, setName] = useState("");
  const [venue, setVenue] = useState("");
  const [status, setStatus] = useState<"idle" | "submitting">("idle");
  const [error, setError] = useState<string | null>(null);

  function reset() {
    setBrand(""); setName(""); setVenue(""); setError(null);
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (status === "submitting") return;
    setError(null);
    setStatus("submitting");
    const res = await fetch("/api/admin/wallet/campaigns", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        brand,
        name,
        venue,
        // Cards are minted later from the campaign page; the prefix is set there.
        cardPrefix: brand.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "campaign",
        cardCount: 0,
        links: [],
      }),
    });
    const data = await res.json().catch(() => ({}));
    if (res.ok) {
      reset();
      setOpen(false);
      setStatus("idle");
      router.push(`/admin/wallet/${data.id}/design`);
    } else {
      setError(data.error ?? "Could not create campaign.");
      setStatus("idle");
    }
  }

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="mb-6 inline-flex h-10 items-center gap-2 rounded-full bg-gold px-5 text-sm font-bold text-ink-deep transition-colors hover:bg-gold-deep"
      >
        <span className="text-lg leading-none">+</span> New campaign
      </button>
    );
  }

  return (
    <form onSubmit={submit} className="mb-6 rounded-2xl border border-line bg-white p-5">
      <h2 className="font-display text-lg font-bold text-ink">New campaign</h2>
      <p className="mb-4 mt-0.5 text-sm text-muted">
        Who it&apos;s for. Next you&apos;ll design the pass, then create the card links.
      </p>
      <div className="grid gap-4 sm:grid-cols-3">
        <Field label="Brand" value={brand} onChange={setBrand} placeholder="Daps Energy" required />
        <Field label="Campaign name" value={name} onChange={setName} placeholder="LMU Sunday sampling" required />
        <Field label="Event / place (optional)" value={venue} onChange={setVenue} placeholder="LMU — Oct 4" />
      </div>

      {error && <p className="mt-3 text-sm text-red-700">{error}</p>}

      <div className="mt-4 flex gap-2">
        <button
          type="submit"
          disabled={status === "submitting" || !brand.trim() || !name.trim()}
          className="h-10 rounded-full bg-gold px-5 text-sm font-bold text-ink-deep hover:bg-gold-deep disabled:opacity-50"
        >
          {status === "submitting" ? "Creating…" : "Create & design the pass →"}
        </button>
        <button
          type="button"
          onClick={() => { setOpen(false); reset(); }}
          className="h-10 rounded-full border border-line px-5 text-sm text-ink/70 hover:text-ink"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}

function Field({
  label, value, onChange, placeholder, required,
}: { label: string; value: string; onChange: (v: string) => void; placeholder?: string; required?: boolean }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-xs font-medium text-muted">{label}</span>
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        required={required}
        className="h-10 w-full rounded-lg border border-line bg-white px-3 text-sm text-ink outline-none placeholder:text-muted/70 focus:border-ink/40"
      />
    </label>
  );
}
