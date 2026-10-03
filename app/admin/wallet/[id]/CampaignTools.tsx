"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type Card = { id: string; url: string; active: boolean; qr: string | null; serial: string | null; redeemed: boolean; scans: number; people: number };
type LinkRow = { action: string; label: string | null; destination: string; appleButton: string | null };
type Store = { id: string; name: string; pin: string | null; legacyPin: boolean };

export default function CampaignTools({
  campaignId,
  defaultPrefix,
  active,
  usesRedemption,
  cardMode,
  cards,
  links,
  stores,
}: {
  campaignId: string;
  defaultPrefix: string;
  active: boolean;
  usesRedemption: boolean;
  cardMode: "shared" | "personal";
  cards: Card[];
  links: LinkRow[];
  stores: Store[];
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [showAll, setShowAll] = useState(false);
  const [copied, setCopied] = useState<string | null>(null);
  const [qrCard, setQrCard] = useState<Card | null>(null);
  const [mintPrefix, setMintPrefix] = useState(cards[0]?.id.split("-")[0] ?? defaultPrefix);
  const [mintCount, setMintCount] = useState("");
  const [mintMsg, setMintMsg] = useState<string | null>(null);
  const [editPinId, setEditPinId] = useState<string | null>(null);
  const [editPinVal, setEditPinVal] = useState("");
  const [storeName, setStoreName] = useState("");
  const [storePin, setStorePin] = useState("");

  async function patch(body: unknown) {
    if (busy) return false;
    setBusy(true);
    const res = await fetch(`/api/admin/wallet/campaigns/${campaignId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    router.refresh();
    setBusy(false);
    return res.ok;
  }

  async function mint() {
    const n = Number(mintCount);
    if (!mintPrefix || !Number.isInteger(n) || n < 1) return;
    // Minting can't be undone from here — every id becomes a live card link — so confirm.
    if (!window.confirm(`Create ${n} new card link${n === 1 ? "" : "s"} starting with "${mintPrefix}-"?`)) return;
    const ok = await patch({ mintCards: { prefix: mintPrefix, count: n } });
    setMintMsg(ok ? `${n} card link${n === 1 ? "" : "s"} created. Download the list below to send for encoding.` : "Couldn't create cards — check the prefix (letters, numbers, - _ . only).");
    if (ok) setMintCount("");
  }

  async function copy(text: string, key: string) {
    await navigator.clipboard.writeText(text);
    setCopied(key);
    setTimeout(() => setCopied(null), 1200);
  }

  // The file whoever encodes the NFC chips works from: one row per card.
  function downloadCsv() {
    const csv = ["card_id,url", ...cards.map((c) => `${c.id},${c.url}`)].join("\n");
    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob([csv], { type: "text/csv" }));
    a.download = `${mintPrefix || "cards"}-card-links.csv`;
    a.click();
    URL.revokeObjectURL(a.href);
  }

  const shownCards = showAll ? cards : cards.slice(0, 8);

  return (
    <>
      {/* ---------------------------------- cards ---------------------------------- */}
      <section id="cards" className="mb-10 scroll-mt-32">
        <h2 className="font-display text-lg font-bold text-ink">Cards</h2>
        <p className="mb-4 mt-0.5 text-sm text-muted">
          Every physical card gets its own link, so each scan is tracked back to that exact card.
        </p>

        <div className="mb-4 rounded-2xl border border-line bg-white p-4">
          <div className="text-sm font-semibold text-ink">How the cards are used</div>
          <div className="mt-2 grid gap-2 sm:grid-cols-2">
            {([
              ["shared", "Shared cards on a table", "A few cards, scanned by many people. Every phone gets its own pass and is counted once, even if it scans again or scans another card."],
              ["personal", "One card per person", "Each card is handed to one person and has one pass. People reached = cards scanned."],
            ] as const).map(([mode, title, hint]) => (
              <button
                key={mode}
                onClick={() => {
                  if (mode === cardMode) return;
                  if (!window.confirm(`Switch to “${title}”? It applies to scans from now on; earlier passes are kept.`)) return;
                  patch({ cardMode: mode });
                }}
                disabled={busy}
                className={`rounded-xl border p-3 text-left transition-colors ${mode === cardMode ? "border-ink bg-ink text-white" : "border-line text-ink hover:border-ink/30"}`}
              >
                <div className="text-sm font-semibold">{mode === cardMode ? "✓ " : ""}{title}</div>
                <div className={`mt-1 text-xs leading-relaxed ${mode === cardMode ? "text-white/80" : "text-muted"}`}>{hint}</div>
              </button>
            ))}
          </div>
        </div>

        <div className="grid gap-4 lg:grid-cols-3">
          <Step n={1} title="Create card links">
            <p className="mb-3 text-xs leading-relaxed text-muted">
              One link per physical card. The prefix starts every card id (e.g.{" "}
              <code className="font-mono text-ink">{mintPrefix || "brand"}-0001-x7k2</code>).{" "}
              {cardMode === "shared" ? "For a table, make one per card laid out, plus a few spares." : "Make one per card you're printing — extras are fine."}
            </p>
            <div className="flex items-end gap-2">
              <Field label="Prefix" value={mintPrefix} onChange={setMintPrefix} mono placeholder="daps" />
              <Field label="How many" value={mintCount} onChange={setMintCount} mono narrow placeholder="150" />
            </div>
            <button
              onClick={mint}
              disabled={busy || !mintPrefix || !(Number(mintCount) > 0)}
              className="mt-3 h-10 w-full rounded-full bg-gold text-sm font-bold text-ink-deep hover:bg-gold-deep disabled:opacity-40"
            >
              Create card links
            </button>
            {mintMsg && <p className="mt-2 text-xs text-ink">{mintMsg}</p>}
          </Step>

          <Step n={2} title="Send the list for encoding">
            <p className="mb-3 text-xs leading-relaxed text-muted">
              Download the list and send it to whoever writes the NFC chips. Each chip gets its own url from the file — never reuse one url on two cards, or their taps merge.
            </p>
            <button
              onClick={downloadCsv}
              disabled={cards.length === 0}
              className="h-10 w-full rounded-full bg-ink text-sm font-semibold text-white hover:bg-ink-deep disabled:opacity-40"
            >
              ↓ Download {cards.length.toLocaleString()} card link{cards.length === 1 ? "" : "s"} (CSV)
            </button>
            <button
              onClick={() => copy(cards.map((c) => `${c.id},${c.url}`).join("\n"), "all")}
              disabled={cards.length === 0}
              className="mt-2 w-full text-xs font-medium text-muted hover:text-ink disabled:opacity-40"
            >
              {copied === "all" ? "Copied ✓" : "or copy them all"}
            </button>
          </Step>

          <Step n={3} title="Test one card">
            <p className="text-xs leading-relaxed text-muted">
              Before the event, tap one encoded card (or scan its <b className="text-ink">QR</b> below) with an iPhone and add the pass.
              It should show up in <b className="text-ink">Activity log</b> within seconds, and the
              <b className="text-ink"> Tested on a phone</b> step above turns green.
            </p>
          </Step>
        </div>

        <div className="mt-4 rounded-2xl border border-line bg-white p-4">
          <div className="mb-2 flex items-baseline justify-between">
            <h3 className="text-sm font-semibold text-ink">
              All cards <span className="ml-1 font-mono text-xs font-normal text-muted">{cards.length}</span>
            </h3>
            <span className="text-[11px] text-muted">Once tapped: Coupon = what they got{usesRedemption ? " · Redeem = cashier page" : ""}</span>
          </div>
          {cards.length === 0 ? (
            <p className="py-6 text-center text-sm text-muted">No card links yet — create them in step 1.</p>
          ) : (
            <ul className="divide-y divide-line">
              {shownCards.map((c) => (
                <li key={c.id} className="flex flex-wrap items-center gap-2 py-2">
                  <code className="w-full truncate font-mono text-xs text-ink sm:w-40 sm:shrink-0">{c.id}</code>
                  <code className="hidden min-w-0 flex-1 truncate font-mono text-[11px] text-muted sm:block">{c.url}</code>
                  {c.scans > 0 ? (
                    <span className="hidden shrink-0 rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-semibold text-emerald-700 sm:inline">
                      {cardMode === "shared" ? `${c.scans} scan${c.scans === 1 ? "" : "s"} · ${c.people} ${c.people === 1 ? "person" : "people"}` : "tapped"}
                    </span>
                  ) : (
                    <span className="hidden shrink-0 rounded-full bg-fill px-2 py-0.5 text-[10px] font-medium text-muted sm:inline">not tapped</span>
                  )}
                  <SmallBtn onClick={() => copy(c.url, c.id)}>{copied === c.id ? "✓" : "Copy"}</SmallBtn>
                  {c.serial && cardMode === "personal" && (
                    <>
                      <SmallLink href={`/coupon/${c.serial}`}>Coupon</SmallLink>
                      {usesRedemption && (
                        <SmallLink href={`/redeem/${c.serial}`} gold={!c.redeemed}>
                          {c.redeemed ? "Redeemed ✓" : "Redeem"}
                        </SmallLink>
                      )}
                    </>
                  )}
                  {c.qr && (
                    <SmallBtn onClick={() => setQrCard(qrCard?.id === c.id ? null : c)} active={qrCard?.id === c.id}>
                      QR
                    </SmallBtn>
                  )}
                </li>
              ))}
            </ul>
          )}
          {cards.length > 8 && (
            <button onClick={() => setShowAll((v) => !v)} className="mt-3 text-xs font-medium text-muted hover:text-ink">
              {showAll ? "Show fewer" : `Show all ${cards.length}`}
            </button>
          )}
          {qrCard && (
            <div className="mt-4 flex flex-wrap items-center gap-4 rounded-xl bg-fill p-4">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={qrCard.qr!} alt={`QR code for card ${qrCard.id}`} className="h-40 w-40 shrink-0 rounded-lg bg-white p-1.5" />
              <div className="min-w-0 flex-1">
                <div className="font-mono text-sm font-semibold text-ink">{qrCard.id}</div>
                <p className="mt-1.5 text-xs leading-relaxed text-muted">
                  Point an iPhone camera at this to open the same link the NFC chip fires — the fastest way to test without a card in hand.
                  It counts as a real tap on this card.
                </p>
                <code className="mt-2 block truncate font-mono text-[11px] text-ink/70">{qrCard.url}</code>
                <SmallBtn onClick={() => setQrCard(null)} className="mt-3">Close</SmallBtn>
              </div>
            </div>
          )}
        </div>
      </section>

      {/* ------------------------------ links & stores ------------------------------ */}
      <section id="links" className="mb-10 scroll-mt-32">
        <h2 className="font-display text-lg font-bold text-ink">{usesRedemption ? "Links & stores" : "Links"}</h2>
        <p className="mb-4 mt-0.5 text-sm text-muted">
          Where the pass sends people. Every tap goes through Campus Run first, so it&apos;s counted, then forwards instantly.
        </p>

        <div className="grid gap-4 lg:grid-cols-3">
          <div className="rounded-2xl border border-line bg-white p-4 lg:col-span-2">
            <h3 className="mb-3 text-sm font-semibold text-ink">Pass links</h3>
            {links.length === 0 ? (
              <p className="text-sm text-muted">No links on this pass.</p>
            ) : (
              <ul className="divide-y divide-line">
                {links.map((l) => (
                  <li key={l.action} className="py-2.5">
                    <div className="flex flex-wrap items-baseline gap-x-2">
                      <span className="text-sm font-semibold text-ink">{l.label || l.action}</span>
                      {l.appleButton && (
                        <span className="text-[11px] text-muted">
                          iOS 27 button reads <b className="font-semibold text-ink">“{l.appleButton}”</b>
                        </span>
                      )}
                    </div>
                    <a href={l.destination} target="_blank" rel="noreferrer" className="mt-0.5 block truncate font-mono text-[11px] text-muted hover:text-ink">
                      → {l.destination}
                    </a>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className="rounded-2xl border border-line bg-white p-4">
            <h3 className="text-sm font-semibold text-ink">Campaign status</h3>
            <p className="mt-1 text-xs leading-relaxed text-muted">
              {active
                ? "Live — cards hand out passes and links forward normally."
                : "Paused — taps open the web page instead of a Wallet pass. Taps are still tracked; nothing is deleted."}
            </p>
            <button
              onClick={() => {
                if (active && !window.confirm("Pause this campaign? Cards will open the web page instead of a Wallet pass until you turn it back on.")) return;
                patch({ active: !active });
              }}
              disabled={busy}
              className={`mt-3 h-9 w-full rounded-full text-sm font-semibold disabled:opacity-50 ${
                active ? "border border-line text-ink hover:border-ink/30" : "bg-ink text-white hover:bg-ink-deep"
              }`}
            >
              {active ? "Pause campaign" : "Turn campaign on"}
            </button>
          </div>

          {usesRedemption && (
            <div className="rounded-2xl border border-line bg-white p-4 lg:col-span-3">
              <h3 className="text-sm font-semibold text-ink">Stores</h3>
              <p className="mb-3 mt-1 text-xs leading-relaxed text-muted">
                For in-store redemption: the cashier scans the pass barcode with their own phone camera, picks their store once, and confirms.
                The PIN is a shared code you give that store&apos;s staff — it stops students redeeming themselves.
              </p>
              {stores.length > 0 && (
                <ul className="mb-3 divide-y divide-line text-xs">
                  {stores.map((s) => (
                    <li key={s.id} className="py-2">
                      <div className="flex items-center gap-2">
                        <span className="min-w-0 flex-1 truncate text-sm text-ink">{s.name}</span>
                        {editPinId !== s.id && (
                          <>
                            {s.pin ? (
                              <code className="rounded-full border border-gold bg-gold/15 px-2 py-0.5 font-mono text-[11px] tracking-widest text-ink">{s.pin}</code>
                            ) : (
                              <span className="text-[11px] text-muted">{s.legacyPin ? "PIN set (hidden)" : "no PIN"}</span>
                            )}
                            <SmallBtn onClick={() => { setEditPinId(s.id); setEditPinVal(s.pin ?? ""); }}>
                              {s.pin || s.legacyPin ? "Change PIN" : "Set PIN"}
                            </SmallBtn>
                          </>
                        )}
                      </div>
                      {editPinId === s.id && (
                        <div className="mt-2 flex items-center gap-2">
                          <input
                            value={editPinVal}
                            onChange={(e) => setEditPinVal(e.target.value)}
                            placeholder="1234"
                            autoFocus
                            className="h-8 w-24 rounded-lg border border-line bg-white px-2 font-mono text-xs tracking-widest text-ink outline-none focus:border-ink/40"
                          />
                          <button
                            onClick={() => { patch({ setStorePin: { storeId: s.id, pin: editPinVal } }); setEditPinId(null); }}
                            disabled={busy}
                            className="h-8 rounded-full bg-ink px-3 text-[11px] font-semibold text-white hover:bg-ink-deep disabled:opacity-50"
                          >
                            Save
                          </button>
                          <SmallBtn onClick={() => setEditPinId(null)}>Cancel</SmallBtn>
                          <span className="text-[10px] text-muted">blank = no PIN</span>
                        </div>
                      )}
                    </li>
                  ))}
                </ul>
              )}
              <div className="flex flex-wrap items-end gap-2">
                <Field label="Store name" value={storeName} onChange={setStoreName} placeholder="Whole Foods Playa Vista" />
                <Field label="Staff PIN (optional)" value={storePin} onChange={setStorePin} mono narrow />
                <button
                  onClick={() => { patch({ addStore: { name: storeName, pin: storePin || undefined } }); setStoreName(""); setStorePin(""); }}
                  disabled={busy || !storeName.trim()}
                  className="h-9 rounded-full bg-ink px-4 text-xs font-semibold text-white hover:bg-ink-deep disabled:opacity-40"
                >
                  Add store
                </button>
              </div>
            </div>
          )}
        </div>
      </section>
    </>
  );
}

function Step({ n, title, children }: { n: number; title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-line bg-white p-4">
      <div className="mb-2 flex items-center gap-2">
        <span className="flex h-6 w-6 items-center justify-center rounded-full bg-ink text-xs font-bold text-white">{n}</span>
        <h3 className="text-sm font-semibold text-ink">{title}</h3>
      </div>
      {children}
    </div>
  );
}

function SmallBtn({ children, onClick, active, className = "" }: { children: React.ReactNode; onClick: () => void; active?: boolean; className?: string }) {
  return (
    <button
      onClick={onClick}
      className={`shrink-0 rounded-full border px-2.5 py-1 text-[11px] font-medium transition-colors ${
        active ? "border-ink bg-ink text-white" : "border-line text-ink/70 hover:border-ink/30 hover:text-ink"
      } ${className}`}
    >
      {children}
    </button>
  );
}

function SmallLink({ href, children, gold }: { href: string; children: React.ReactNode; gold?: boolean }) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noreferrer"
      className={`shrink-0 rounded-full border px-2.5 py-1 text-[11px] font-medium transition-colors ${
        gold ? "border-gold bg-gold/15 text-ink hover:bg-gold/30" : "border-line text-ink/70 hover:border-ink/30 hover:text-ink"
      }`}
    >
      {children}
    </a>
  );
}

function Field({
  label, value, onChange, mono, narrow, placeholder,
}: { label: string; value: string; onChange: (v: string) => void; mono?: boolean; narrow?: boolean; placeholder?: string }) {
  return (
    <label className={`block ${narrow ? "w-24" : "min-w-0 flex-1"}`}>
      <span className="mb-1 block text-[11px] font-medium text-muted">{label}</span>
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className={`h-9 w-full rounded-lg border border-line bg-white px-2.5 text-sm text-ink outline-none placeholder:text-muted/60 focus:border-ink/40 ${mono ? "font-mono" : ""}`}
      />
    </label>
  );
}
