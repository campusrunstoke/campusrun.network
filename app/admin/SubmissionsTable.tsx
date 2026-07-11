"use client";

import { useMemo, useState } from "react";

type Row = {
  id: string;
  ts: string;
  rating: number;
  email: string | null;
  e: string | null;
  b: string | null;
  c: string | null;
  ua: string | null;
};

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const pad = (n: number) => String(n).padStart(2, "0");

function fmtTs(ts: string) {
  const d = new Date(ts);
  return `${MONTHS[d.getUTCMonth()]} ${pad(d.getUTCDate())} · ${pad(d.getUTCHours())}:${pad(d.getUTCMinutes())}:${pad(d.getUTCSeconds())}`;
}

export default function SubmissionsTable({
  rows,
  total,
  shown,
}: {
  rows: Row[];
  total: number;
  shown: number;
}) {
  const [query, setQuery] = useState("");

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter((r) =>
      [r.email, r.e, r.b, r.c].some((v) => v?.toLowerCase().includes(q)),
    );
  }, [rows, query]);

  return (
    <section className="rounded-2xl border border-white/10 bg-white/[0.02] backdrop-blur-sm">
      {/* toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/10 px-4 py-3.5">
        <div className="flex items-center gap-3">
          <h2 className="font-display text-sm font-semibold text-white">Submissions</h2>
          <span className="font-mono text-[11px] text-[#6B7688]">
            {query ? `${filtered.length} match` : `${shown} of ${total.toLocaleString()}`}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <div className="relative">
            <svg
              className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[#5A6577]"
              viewBox="0 0 24 24"
              fill="none"
            >
              <circle cx="11" cy="11" r="7" stroke="currentColor" strokeWidth="2" />
              <path d="m20 20-3-3" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            </svg>
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Filter email / drop / brand / card"
              className="h-9 w-64 max-w-[60vw] rounded-lg border border-white/10 bg-white/5 pl-8 pr-3 text-xs text-white outline-none transition-colors placeholder:text-[#5A6577] focus:border-[#FFCC00]/50"
            />
          </div>
          <a
            href="/api/export"
            className="flex h-9 items-center gap-1.5 rounded-lg border border-[#FFCC00]/30 bg-[#FFCC00]/10 px-3 text-xs font-semibold text-[#FFCC00] transition-colors hover:bg-[#FFCC00]/20"
          >
            <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none">
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
        </div>
      </div>

      {/* table */}
      <div className="overflow-x-auto">
        <table className="w-full border-collapse text-sm">
          <thead>
            <tr className="text-left text-[10px] uppercase tracking-[0.14em] text-[#6B7688]">
              <Th>Time (UTC)</Th>
              <Th>Stoke</Th>
              <Th>Email</Th>
              <Th>Drop</Th>
              <Th>Brand</Th>
              <Th>Card</Th>
              <Th>Device</Th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 && (
              <tr>
                <td colSpan={7} className="px-4 py-12 text-center text-sm text-[#6B7688]">
                  {query ? "No matches." : "No submissions yet."}
                </td>
              </tr>
            )}
            {filtered.map((r) => (
              <tr
                key={r.id}
                className="border-t border-white/[0.06] transition-colors hover:bg-white/[0.03]"
              >
                <td className="whitespace-nowrap px-4 py-3 font-mono text-xs text-[#9AA6B8]">
                  {fmtTs(r.ts)}
                </td>
                <td className="px-4 py-3">
                  <Meter n={r.rating} />
                </td>
                <td className="px-4 py-3">
                  {r.email ? (
                    <span className="font-mono text-xs text-[#E5E9F0]">{r.email}</span>
                  ) : (
                    <span className="text-xs text-[#4A5468]">— no email</span>
                  )}
                </td>
                <td className="px-4 py-3">
                  <Chip value={r.e} />
                </td>
                <td className="px-4 py-3">
                  <Chip value={r.b} accent />
                </td>
                <td className="px-4 py-3">
                  <Chip value={r.c} />
                </td>
                <td className="max-w-[220px] truncate px-4 py-3 text-xs text-[#6B7688]">
                  {r.ua ?? "—"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function Th({ children }: { children: React.ReactNode }) {
  return <th className="whitespace-nowrap px-4 py-3 font-medium">{children}</th>;
}

function Meter({ n }: { n: number }) {
  return (
    <div className="flex items-center gap-2">
      <div className="flex gap-0.5">
        {[1, 2, 3, 4, 5].map((i) => (
          <span
            key={i}
            className={`h-3.5 w-1.5 rounded-full ${i <= n ? "bg-[#FFCC00]" : "bg-white/10"}`}
          />
        ))}
      </div>
      <span className="font-mono text-xs font-semibold text-white">{n}</span>
    </div>
  );
}

function Chip({ value, accent }: { value: string | null; accent?: boolean }) {
  if (!value) return <span className="text-xs text-[#4A5468]">—</span>;
  return (
    <span
      className={`inline-block rounded-md border px-2 py-0.5 font-mono text-[11px] ${
        accent
          ? "border-[#22D3EE]/25 bg-[#22D3EE]/10 text-[#7DE3FF]"
          : "border-white/10 bg-white/5 text-[#C3CBD9]"
      }`}
    >
      {value}
    </span>
  );
}
