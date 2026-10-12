"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { defaultOfferPage, smsConsentText, type OfferPage } from "@/lib/offer";

/**
 * Edit the campaign's offer page — what the pass's offer button opens. Point a pass
 * link at https://www.campusrun.network/offer/{pass} to use it ({pass} is filled in
 * per student, so each response ties back to their pass and card).
 */
export default function OfferPageEditor({
  campaignId,
  brand,
  initial,
  linked,
  site,
}: {
  campaignId: string;
  brand: string;
  initial: OfferPage | null;
  linked: boolean;
  site: string;
}) {
  const router = useRouter();
  const [page, setPage] = useState<OfferPage>(initial ?? defaultOfferPage(brand));
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const set = <K extends keyof OfferPage>(k: K, v: OfferPage[K]) => setPage((p) => ({ ...p, [k]: v }));
  const str = (v: string | null) => v ?? "";

  async function save() {
    setBusy(true);
    setMsg(null);
    const res = await fetch(`/api/admin/wallet/campaigns/${campaignId}/offer`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ offerPage: page }),
    });
    const json = await res.json().catch(() => ({}));
    setBusy(false);
    setMsg(res.ok ? { ok: true, text: "Saved — live on the offer page now." } : { ok: false, text: json.error ?? "Save failed." });
    if (res.ok) router.refresh();
  }

  const input = "h-9 w-full rounded-lg border border-line bg-white px-2.5 text-sm text-ink outline-none placeholder:text-muted/60 focus:border-ink/40";
  const area = "w-full rounded-lg border border-line bg-white px-2.5 py-2 text-sm text-ink outline-none focus:border-ink/40";
  const linkValue = `${site}/offer/{pass}`;

  return (
    <section id="offer" className="mb-10 scroll-mt-32">
      <h2 className="font-display text-lg font-bold text-ink">Offer page</h2>
      <p className="mb-4 mt-0.5 text-sm text-muted">
        What the pass&apos;s offer button opens: the offer everyone gets, one optional question, and an optional phone number with a separate texts opt-in.
      </p>
      <div className="grid gap-4 lg:grid-cols-3">
        <div className="rounded-2xl border border-line bg-white p-4 lg:col-span-2">
          <div className="grid gap-3 sm:grid-cols-2">
            <F label="Small line above the headline"><input id="op-eyebrow" value={str(page.eyebrow)} onChange={(e) => set("eyebrow", e.target.value)} className={input} /></F>
            <F label="Headline"><input id="op-headline" value={page.headline} onChange={(e) => set("headline", e.target.value)} className={input} /></F>
            <div className="sm:col-span-2">
              <F label="Details" hint="How to use it, where, and until when.">
                <textarea id="op-details" rows={3} value={str(page.details)} onChange={(e) => set("details", e.target.value)} className={area} />
              </F>
            </div>
            <F label="Promo code (optional)"><input id="op-code" value={str(page.code)} onChange={(e) => set("code", e.target.value)} className={`${input} font-mono`} /></F>
            <F label="Brand name (used in the texts opt-in)"><input id="op-brand" value={page.brandName} onChange={(e) => set("brandName", e.target.value)} className={input} /></F>
            <F label="Button text (optional)"><input id="op-cta-label" value={str(page.ctaLabel)} onChange={(e) => set("ctaLabel", e.target.value)} placeholder="Shop Pocari Sweat" className={input} /></F>
            <F label="Button link (optional)"><input id="op-cta-url" value={str(page.ctaUrl)} onChange={(e) => set("ctaUrl", e.target.value)} placeholder="https://…" className={`${input} font-mono text-xs`} /></F>
            <div className="sm:col-span-2">
              <F label="Question (optional — any answer counts)"><input id="op-question" value={str(page.question)} onChange={(e) => set("question", e.target.value)} placeholder="Ever heard of Pocari Sweat?" className={input} /></F>
            </div>
            <div className="sm:col-span-2">
              <F label="Fine print (optional)"><textarea id="op-terms" rows={2} value={str(page.terms)} onChange={(e) => set("terms", e.target.value)} className={area} /></F>
            </div>
          </div>
          <label className="mt-3 flex cursor-pointer items-start gap-2.5">
            <input id="op-askphone" type="checkbox" checked={page.askPhone} onChange={(e) => set("askPhone", e.target.checked)} className="mt-0.5 h-4 w-4 accent-[#003b5c]" />
            <span>
              <span className="block text-sm text-ink">Ask for a phone number (optional for them)</span>
              <span className="block text-[11px] leading-snug text-muted">Shows an unticked opt-in: “{smsConsentText(page.brandName)}”</span>
            </span>
          </label>
          <div className="mt-4 flex flex-wrap items-center gap-2">
            <button onClick={save} disabled={busy || !page.headline.trim()} className="h-9 rounded-full bg-gold px-4 text-sm font-bold text-ink-deep hover:bg-gold-deep disabled:opacity-40">
              {busy ? "Saving…" : "Save offer page"}
            </button>
            <a href={`/offer/preview?campaign=${campaignId}`} target="_blank" rel="noreferrer" className="h-9 rounded-full border border-line px-4 text-sm font-medium leading-9 text-ink hover:border-ink/30">
              Preview ↗
            </a>
            {msg && <span className={`text-xs ${msg.ok ? "text-emerald-700" : "text-red-700"}`}>{msg.text}</span>}
          </div>
        </div>
        <div className="rounded-2xl border border-line bg-white p-4">
          <h3 className="text-sm font-semibold text-ink">Connect it to the pass</h3>
          <p className="mt-1 text-xs leading-relaxed text-muted">
            {linked ? "✓ A pass link already opens this page." : "In ✎ Design pass → Buttons & links, set the offer link to:"}
          </p>
          <code className="mt-2 block break-all rounded-lg bg-fill p-2 font-mono text-[11px] text-ink">{linkValue}</code>
          <div className="mt-4 grid gap-2 border-t border-line pt-3">
            <a href={`/api/export?type=offer&campaign=${campaignId}&mode=brand`} className="text-sm font-semibold text-ink underline underline-offset-4">↓ Responses for the brand (no phones)</a>
            <a href={`/api/export?type=offer&campaign=${campaignId}&mode=internal`} className="text-xs text-muted underline underline-offset-4">↓ Internal, with phones + consent records</a>
          </div>
          <p className="mt-3 text-[11px] leading-relaxed text-muted">
            Keep <code className="font-mono">{"{pass}"}</code> exactly as written — it&apos;s replaced with each student&apos;s pass, so every response ties to their pass and card.
          </p>
        </div>
      </div>
    </section>
  );
}

function F({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1 block text-[11px] font-semibold text-muted">{label}</span>
      {children}
      {hint && <span className="mt-1 block text-[11px] text-muted">{hint}</span>}
    </label>
  );
}
