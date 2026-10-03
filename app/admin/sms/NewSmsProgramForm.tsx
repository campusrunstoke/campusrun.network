"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { DEFAULT_REPLIES, fillReply } from "@/lib/sms";

/**
 * Create a giveaway. The replies start from drafts filled with this brand, keyword and
 * question — they're all editable on the giveaway's page before anyone texts.
 */
export default function NewSmsProgramForm({ campaigns }: { campaigns: { id: string; brand: string; name: string }[] }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [brand, setBrand] = useState("");
  const [keyword, setKeyword] = useState("");
  const [question, setQuestion] = useState("");
  const [campaignId, setCampaignId] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const v = { brand: brand.trim(), keyword: keyword.trim().toUpperCase(), question: question.trim() || null };
    const fill = (t: string) => fillReply(t, v);
    const res = await fetch("/api/admin/sms/programs", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: `${v.brand} giveaway`,
        keyword: v.keyword,
        walletCampaignId: campaignId || null,
        question: v.question,
        replyEntry: v.question ? fill(DEFAULT_REPLIES.replyEntry) : fill(DEFAULT_REPLIES.replyEntry.replace(" Quick question: {QUESTION}", "")),
        replyAnswer: fill(DEFAULT_REPLIES.replyAnswer),
        replyWrongKeyword: fill(DEFAULT_REPLIES.replyWrongKeyword),
        replyHelp: fill(DEFAULT_REPLIES.replyHelp),
        replyClosed: fill(DEFAULT_REPLIES.replyClosed),
      }),
    });
    const data = await res.json().catch(() => ({}));
    setBusy(false);
    if (!res.ok) return setError(data.error ?? "Couldn't create the giveaway.");
    router.push(`/admin/sms/${data.id}`);
  }

  if (!open) {
    return (
      <button onClick={() => setOpen(true)} className="mb-6 inline-flex h-10 items-center gap-2 rounded-full bg-gold px-5 text-sm font-bold text-ink-deep hover:bg-gold-deep">
        <span className="text-lg leading-none">+</span> New text giveaway
      </button>
    );
  }

  const input = "h-10 w-full rounded-lg border border-line bg-white px-3 text-sm text-ink outline-none placeholder:text-muted/70 focus:border-ink/40";
  return (
    <form onSubmit={submit} className="mb-6 rounded-2xl border border-line bg-white p-5">
      <h2 className="font-display text-lg font-bold text-ink">New text giveaway</h2>
      <p className="mb-4 mt-0.5 text-sm text-muted">You&apos;ll be able to edit every reply on the next screen.</p>
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="block">
          <span className="mb-1.5 block text-xs font-medium text-muted">Brand</span>
          <input value={brand} onChange={(e) => setBrand(e.target.value)} placeholder="Pocari Sweat" required className={input} />
        </label>
        <label className="block">
          <span className="mb-1.5 block text-xs font-medium text-muted">Keyword they text</span>
          <input value={keyword} onChange={(e) => setKeyword(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, ""))} placeholder="POCARI" required className={`${input} font-mono`} />
        </label>
        <label className="block sm:col-span-2">
          <span className="mb-1.5 block text-xs font-medium text-muted">Bonus question (optional — any reply counts)</span>
          <input value={question} onChange={(e) => setQuestion(e.target.value)} placeholder="Did you know Pocari Sweat was in the US?" className={input} />
        </label>
        <label className="block sm:col-span-2">
          <span className="mb-1.5 block text-xs font-medium text-muted">Wallet campaign it belongs to (optional)</span>
          <select value={campaignId} onChange={(e) => setCampaignId(e.target.value)} className={input}>
            <option value="">None</option>
            {campaigns.map((c) => (
              <option key={c.id} value={c.id}>{c.brand} — {c.name}</option>
            ))}
          </select>
        </label>
      </div>
      {error && <p className="mt-3 text-sm text-red-700">{error}</p>}
      <div className="mt-4 flex gap-2">
        <button type="submit" disabled={busy || !brand.trim() || keyword.length < 2} className="h-10 rounded-full bg-gold px-5 text-sm font-bold text-ink-deep hover:bg-gold-deep disabled:opacity-50">
          {busy ? "Creating…" : "Create giveaway →"}
        </button>
        <button type="button" onClick={() => setOpen(false)} className="h-10 rounded-full border border-line px-5 text-sm text-ink/70 hover:text-ink">Cancel</button>
      </div>
    </form>
  );
}
