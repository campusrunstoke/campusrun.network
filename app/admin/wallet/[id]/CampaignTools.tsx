"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type Card = { id: string; url: string; active: boolean };
type LinkRow = { action: string; destination: string };
type Store = { id: string; name: string; hasPin: boolean };

export default function CampaignTools({
  campaignId,
  active,
  cards,
  links,
  stores,
}: {
  campaignId: string;
  active: boolean;
  cards: Card[];
  links: LinkRow[];
  stores: Store[];
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [showAll, setShowAll] = useState(false);
  const [copied, setCopied] = useState<string | null>(null);
  const [mintPrefix, setMintPrefix] = useState(cards[0]?.id.split("-")[0] ?? "");
  const [mintCount, setMintCount] = useState("50");
  const [storeName, setStoreName] = useState("");
  const [storePin, setStorePin] = useState("");

  async function patch(body: unknown) {
    if (busy) return;
    setBusy(true);
    await fetch(`/api/admin/wallet/campaigns/${campaignId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    router.refresh();
    setBusy(false);
  }

  async function copy(text: string, key: string) {
    await navigator.clipboard.writeText(text);
    setCopied(key);
    setTimeout(() => setCopied(null), 1200);
  }

  const shownCards = showAll ? cards : cards.slice(0, 8);

  return (
    <div className="mt-6 grid gap-6 lg:grid-cols-3">
      {/* cards */}
      <section className="rounded-2xl border border-white/10 bg-white/[0.02] p-4 lg:col-span-2">
        <div className="mb-3 flex items-baseline justify-between">
          <h2 className="font-display text-sm font-semibold text-white">
            Cards <span className="ml-1 font-mono text-xs text-[#6B7688]">{cards.length}</span>
          </h2>
          <button
            onClick={() => copy(cards.map((c) => `${c.id},${c.url}`).join("\n"), "all")}
            className="text-xs text-[#9AA6B8] hover:text-white"
          >
            {copied === "all" ? "Copied ✓" : "Copy all as CSV"}
          </button>
        </div>
        <p className="mb-3 text-xs text-[#6B7688]">
          Each URL is what KC encodes on the NFC chip / prints as the QR on that card.
        </p>
        {cards.length === 0 ? (
          <p className="text-sm text-[#6B7688]">No cards minted yet.</p>
        ) : (
          <ul className="divide-y divide-white/[0.06]">
            {shownCards.map((c) => (
              <li key={c.id} className="flex items-center gap-3 py-2">
                <code className="w-40 shrink-0 truncate font-mono text-xs text-[#C3CBD9]">{c.id}</code>
                <code className="min-w-0 flex-1 truncate font-mono text-[11px] text-[#7DE3FF]">{c.url}</code>
                <button
                  onClick={() => copy(c.url, c.id)}
                  className="shrink-0 rounded-md border border-white/10 px-2 py-1 text-[11px] text-[#9AA6B8] hover:text-white"
                >
                  {copied === c.id ? "✓" : "Copy"}
                </button>
              </li>
            ))}
          </ul>
        )}
        {cards.length > 8 && (
          <button onClick={() => setShowAll((v) => !v)} className="mt-3 text-xs text-[#9AA6B8] hover:text-white">
            {showAll ? "Show fewer" : `Show all ${cards.length}`}
          </button>
        )}
        <div className="mt-4 flex flex-wrap items-end gap-2 border-t border-white/[0.06] pt-4">
          <Field label="Prefix" value={mintPrefix} onChange={setMintPrefix} mono />
          <Field label="Count" value={mintCount} onChange={setMintCount} mono narrow />
          <button
            onClick={() => patch({ mintCards: { prefix: mintPrefix, count: mintCount } })}
            disabled={busy || !mintPrefix}
            className="h-9 rounded-lg bg-[#FFCC00] px-3 text-xs font-bold text-[#0A1420] hover:bg-[#FFD633] disabled:opacity-50"
          >
            Mint more cards
          </button>
        </div>
      </section>

      {/* links + stores + state */}
      <div className="space-y-6">
        <section className="rounded-2xl border border-white/10 bg-white/[0.02] p-4">
          <h2 className="mb-3 font-display text-sm font-semibold text-white">Pass links</h2>
          {links.length === 0 ? (
            <p className="text-sm text-[#6B7688]">No links configured.</p>
          ) : (
            <ul className="space-y-2 text-xs">
              {links.map((l) => (
                <li key={l.action} className="flex gap-2">
                  <span className="w-16 shrink-0 uppercase tracking-wider text-[#6B7688]">{l.action}</span>
                  <span className="min-w-0 truncate font-mono text-[#C3CBD9]">{l.destination}</span>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="rounded-2xl border border-white/10 bg-white/[0.02] p-4">
          <h2 className="mb-1 font-display text-sm font-semibold text-white">Stores</h2>
          <p className="mb-3 text-xs text-[#6B7688]">
            For staff redemption: the cashier scans the pass barcode with their phone camera,
            picks their store once, confirms. A PIN stops students self-redeeming.
          </p>
          {stores.length > 0 && (
            <ul className="mb-3 space-y-2 text-xs">
              {stores.map((s) => (
                <li key={s.id} className="flex items-center gap-2 text-[#C3CBD9]">
                  {s.name}
                  {s.hasPin && <span className="text-[#6B7688]">· PIN</span>}
                </li>
              ))}
            </ul>
          )}
          <div className="flex flex-wrap items-end gap-2">
            <Field label="Store name" value={storeName} onChange={setStoreName} />
            <Field label="Staff PIN (opt.)" value={storePin} onChange={setStorePin} mono narrow />
            <button
              onClick={() => {
                patch({ addStore: { name: storeName, pin: storePin || undefined } });
                setStoreName("");
                setStorePin("");
              }}
              disabled={busy || !storeName.trim()}
              className="h-9 rounded-lg border border-[#FFCC00]/30 bg-[#FFCC00]/10 px-3 text-xs font-semibold text-[#FFCC00] hover:bg-[#FFCC00]/20 disabled:opacity-50"
            >
              Add
            </button>
          </div>
        </section>

        <section className="flex items-center justify-between rounded-2xl border border-white/10 bg-white/[0.02] p-4">
          <span className="text-xs text-[#9AA6B8]">Campaign is {active ? "active" : "paused"}</span>
          <button
            onClick={() => patch({ active: !active })}
            disabled={busy}
            className="rounded-lg border border-white/10 px-3 py-1 text-xs text-[#9AA6B8] hover:text-white disabled:opacity-50"
          >
            {active ? "Pause" : "Activate"}
          </button>
        </section>
      </div>
    </div>
  );
}

function Field({
  label, value, onChange, mono, narrow,
}: { label: string; value: string; onChange: (v: string) => void; mono?: boolean; narrow?: boolean }) {
  return (
    <label className={`block ${narrow ? "w-24" : "min-w-0 flex-1"}`}>
      <span className="mb-1 block text-[10px] uppercase tracking-wider text-[#6B7688]">{label}</span>
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={`h-9 w-full rounded-lg border border-white/10 bg-white/5 px-2.5 text-xs text-white outline-none focus:border-[#FFCC00]/50 ${mono ? "font-mono" : ""}`}
      />
    </label>
  );
}
