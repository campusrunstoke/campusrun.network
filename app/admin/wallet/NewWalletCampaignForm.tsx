"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type Action = "map" | "website" | "video" | "shop";
const ACTIONS: { action: Action; label: string; placeholder: string }[] = [
  { action: "map", label: "Where to buy (map)", placeholder: "https://maps.google.com/?q=…" },
  { action: "website", label: "Website", placeholder: "https://brand.com" },
  { action: "video", label: "Video", placeholder: "https://youtube.com/…" },
  { action: "shop", label: "Shop", placeholder: "https://brand.com/shop" },
];

export default function NewWalletCampaignForm() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [brand, setBrand] = useState("");
  const [name, setName] = useState("");
  const [venue, setVenue] = useState("");
  const [cardPrefix, setCardPrefix] = useState("");
  const [cardCount, setCardCount] = useState("200");
  const [links, setLinks] = useState<Record<Action, string>>({ map: "", website: "", video: "", shop: "" });
  const [status, setStatus] = useState<"idle" | "submitting">("idle");
  const [error, setError] = useState<string | null>(null);

  function reset() {
    setBrand(""); setName(""); setVenue(""); setCardPrefix(""); setCardCount("200");
    setLinks({ map: "", website: "", video: "", shop: "" }); setError(null);
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
        cardPrefix: cardPrefix || brand.toLowerCase().replace(/[^a-z0-9]+/g, "-"),
        cardCount,
        links: (Object.keys(links) as Action[])
          .filter((a) => links[a].trim())
          .map((a) => ({ action: a, destination: links[a].trim() })),
      }),
    });
    const data = await res.json().catch(() => ({}));
    if (res.ok) {
      reset();
      setOpen(false);
      setStatus("idle");
      router.push(`/admin/wallet/${data.id}`);
      router.refresh();
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
        Creates the campaign, its links and its card links in one go. The pass design (logo, artwork, colors, wording)
        is set up separately for now — until it is, the pass shows Campus Run placeholder art.
      </p>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Brand" value={brand} onChange={setBrand} placeholder="Pocari Sweat" />
        <Field label="Campaign name" value={name} onChange={setName} placeholder="Fallapalooza coupon" />
        <Field label="Venue / event" value={venue} onChange={setVenue} placeholder="LMU — Fallapalooza, Oct 4" />
        <div className="grid grid-cols-2 gap-3">
          <Field label="Card prefix" value={cardPrefix} onChange={setCardPrefix} placeholder="pocari" mono />
          <Field label="# card links" value={cardCount} onChange={setCardCount} placeholder="200" mono />
        </div>
      </div>

      <div className="mt-5">
        <div className="mb-2 text-xs font-medium text-muted">
          Pass links <span className="text-muted">— each is tracked before it redirects. Leave blank to omit.</span>
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          {ACTIONS.map((a) => (
            <Field
              key={a.action}
              label={a.label}
              value={links[a.action]}
              onChange={(v) => setLinks((cur) => ({ ...cur, [a.action]: v }))}
              placeholder={a.placeholder}
            />
          ))}
        </div>
      </div>

      {error && <p className="mt-3 text-sm text-red-700">{error}</p>}

      <div className="mt-4 flex gap-2">
        <button
          type="submit"
          disabled={status === "submitting"}
          className="h-10 rounded-full bg-gold px-5 text-sm font-bold text-ink-deep hover:bg-gold-deep disabled:opacity-60"
        >
          {status === "submitting" ? "Creating…" : "Create + mint cards"}
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
  label, value, onChange, placeholder, mono,
}: { label: string; value: string; onChange: (v: string) => void; placeholder?: string; mono?: boolean }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-xs font-medium text-muted">{label}</span>
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className={`h-10 w-full rounded-lg border border-line bg-white px-3 text-sm text-ink outline-none placeholder:text-muted/70 focus:border-ink/40 ${mono ? "font-mono" : ""}`}
      />
    </label>
  );
}
