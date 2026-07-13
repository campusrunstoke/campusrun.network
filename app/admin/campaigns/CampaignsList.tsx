"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type Item = {
  id: string;
  name: string;
  brand: string;
  eventId: string;
  cardNumber: string | null;
  active: boolean;
  url: string;
  qr: string;
  submissions: number;
  avgRating: number;
};

export default function CampaignsList({ items }: { items: Item[] }) {
  if (items.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-white/10 bg-white/[0.02] py-16 text-center">
        <p className="text-sm text-[#9AA6B8]">No campaigns yet.</p>
        <p className="mt-1 text-xs text-[#6B7688]">
          Create one to generate an NFC link for a drop.
        </p>
      </div>
    );
  }
  return (
    <div className="grid gap-4 lg:grid-cols-2">
      {items.map((it) => (
        <Card key={it.id} item={it} />
      ))}
    </div>
  );
}

function Card({ item }: { item: Item }) {
  const router = useRouter();
  const [copied, setCopied] = useState(false);
  const [busy, setBusy] = useState(false);

  async function copy() {
    await navigator.clipboard.writeText(item.url);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }
  async function toggle() {
    if (busy) return;
    setBusy(true);
    await fetch(`/api/admin/campaigns/${item.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ active: !item.active }),
    });
    router.refresh();
    setBusy(false);
  }
  async function del() {
    if (!confirm(`Delete "${item.name}"? Submissions are kept.`)) return;
    setBusy(true);
    await fetch(`/api/admin/campaigns/${item.id}`, { method: "DELETE" });
    router.refresh();
    setBusy(false);
  }

  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-5 backdrop-blur-sm">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="font-display text-base font-semibold text-white">{item.name}</h3>
          <div className="mt-1.5 flex flex-wrap gap-1.5">
            <Chip accent>{item.brand}</Chip>
            <Chip>{item.eventId}</Chip>
            {item.cardNumber && <Chip>card {item.cardNumber}</Chip>}
          </div>
        </div>
        <button
          onClick={del}
          disabled={busy}
          title="Delete campaign"
          className="rounded-lg border border-white/10 p-1.5 text-[#6B7688] transition-colors hover:border-red-500/40 hover:text-red-300 disabled:opacity-50"
        >
          <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none">
            <path
              d="M4 7h16M9 7V5a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2m2 0v12a1 1 0 0 1-1 1H7a1 1 0 0 1-1-1V7"
              stroke="currentColor"
              strokeWidth="1.7"
              strokeLinecap="round"
            />
          </svg>
        </button>
      </div>

      <div className="mt-4 flex gap-4">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={item.qr} alt="NFC QR code" className="h-24 w-24 shrink-0 rounded-lg" />
        <div className="min-w-0 flex-1">
          <div className="text-[10px] uppercase tracking-wider text-[#6B7688]">NFC link</div>
          <div className="mt-1 flex items-center gap-2">
            <code className="min-w-0 flex-1 truncate rounded-md bg-black/30 px-2 py-1.5 font-mono text-xs text-[#9AA6B8]">
              {item.url}
            </code>
            <button
              onClick={copy}
              className="shrink-0 rounded-md border border-[#FFCC00]/30 bg-[#FFCC00]/10 px-2.5 py-1.5 text-xs font-semibold text-[#FFCC00] transition-colors hover:bg-[#FFCC00]/20"
            >
              {copied ? "Copied ✓" : "Copy"}
            </button>
          </div>
          <div className="mt-3 flex gap-5">
            <Stat label="Taps" value={item.submissions.toLocaleString()} />
            <Stat label="Avg stoke" value={item.avgRating ? item.avgRating.toFixed(1) : "—"} />
          </div>
        </div>
      </div>

      <div className="mt-4 flex items-center justify-between border-t border-white/10 pt-3">
        <span
          className={`inline-flex items-center gap-1.5 text-xs font-medium ${
            item.active ? "text-[#4ADE80]" : "text-[#6B7688]"
          }`}
        >
          <span className={`h-1.5 w-1.5 rounded-full ${item.active ? "bg-[#4ADE80]" : "bg-[#6B7688]"}`} />
          {item.active ? "Active" : "Paused"}
        </span>
        <div className="flex items-center gap-2">
          <a
            href={`/api/export?b=${encodeURIComponent(item.brand)}&e=${encodeURIComponent(item.eventId)}${item.cardNumber ? `&c=${encodeURIComponent(item.cardNumber)}` : ""}`}
            className="flex items-center gap-1 rounded-lg border border-[#FFCC00]/30 bg-[#FFCC00]/10 px-2.5 py-1 text-xs font-semibold text-[#FFCC00] transition-colors hover:bg-[#FFCC00]/20"
            title="Download this campaign's submissions"
          >
            <svg className="h-3 w-3" viewBox="0 0 24 24" fill="none">
              <path
                d="M12 3v12m0 0 4-4m-4 4-4-4M5 21h14"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
            CSV
          </a>
          <button
            onClick={toggle}
            disabled={busy}
            className="rounded-lg border border-white/10 px-3 py-1 text-xs font-medium text-[#9AA6B8] transition-colors hover:text-white disabled:opacity-50"
          >
            {item.active ? "Pause" : "Activate"}
          </button>
        </div>
      </div>
    </div>
  );
}

function Chip({ children, accent }: { children: React.ReactNode; accent?: boolean }) {
  return (
    <span
      className={`inline-block rounded-md border px-2 py-0.5 font-mono text-[11px] ${
        accent
          ? "border-[#22D3EE]/25 bg-[#22D3EE]/10 text-[#7DE3FF]"
          : "border-white/10 bg-white/5 text-[#C3CBD9]"
      }`}
    >
      {children}
    </span>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="font-display text-lg font-bold text-white">{value}</div>
      <div className="text-[10px] uppercase tracking-wider text-[#6B7688]">{label}</div>
    </div>
  );
}
