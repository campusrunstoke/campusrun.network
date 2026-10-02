"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import ExportMenu from "./ExportMenu";

type Row = {
  kind: "rating" | "tap";
  id: string;
  ts: string;
  rating: number | null;
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
  const router = useRouter();
  const [deletingId, setDeletingId] = useState<string | null>(null);

  async function del(id: string, kind: "rating" | "tap") {
    if (!confirm("Delete this permanently? This cannot be undone.")) return;
    setDeletingId(id);
    const endpoint = kind === "tap" ? "taps" : "submissions";
    await fetch(`/api/admin/${endpoint}/${id}`, { method: "DELETE" });
    router.refresh();
    setDeletingId(null);
  }

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter((r) =>
      [r.email, r.e, r.b, r.c].some((v) => v?.toLowerCase().includes(q)),
    );
  }, [rows, query]);

  return (
    <section className="rounded-2xl border border-line bg-white backdrop-blur-sm">
      {/* toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line px-4 py-3.5">
        <div className="flex items-center gap-3">
          <h2 className="font-display text-sm font-semibold text-ink">Submissions</h2>
          <span className="font-mono text-[11px] text-muted">
            {query ? `${filtered.length} match` : `${shown} of ${total.toLocaleString()}`}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <div className="relative">
            <svg
              className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted/70"
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
              className="h-9 w-64 max-w-[60vw] rounded-lg border border-line bg-white pl-8 pr-3 text-xs text-ink outline-none transition-colors placeholder:text-muted/70 focus:border-ink/40"
            />
          </div>
          <ExportMenu />
        </div>
      </div>

      {/* table */}
      <div className="overflow-x-auto">
        <table className="w-full border-collapse text-sm">
          <thead>
            <tr className="text-left text-[10px] uppercase tracking-[0.14em] text-muted">
              <Th>Time (UTC)</Th>
              <Th>Type</Th>
              <Th>Stoke</Th>
              <Th>Email</Th>
              <Th>Drop</Th>
              <Th>Brand</Th>
              <Th>Card</Th>
              <Th>Device</Th>
              <Th></Th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 && (
              <tr>
                <td colSpan={9} className="px-4 py-12 text-center text-sm text-muted">
                  {query ? "No matches." : "No submissions yet."}
                </td>
              </tr>
            )}
            {filtered.map((r) => (
              <tr
                key={r.id}
                className="border-t border-line transition-colors hover:bg-fill"
              >
                <td className="whitespace-nowrap px-4 py-3 font-mono text-xs text-muted">
                  {fmtTs(r.ts)}
                </td>
                <td className="px-4 py-3">
                  <TypeBadge kind={r.kind} />
                </td>
                <td className="px-4 py-3">
                  {r.kind === "rating" && r.rating ? (
                    <Meter n={r.rating} />
                  ) : (
                    <span className="text-muted/70">—</span>
                  )}
                </td>
                <td className="px-4 py-3">
                  {r.email ? (
                    <span className="font-mono text-xs text-ink">{r.email}</span>
                  ) : (
                    <span className="text-xs text-muted/70">
                      {r.kind === "tap" ? "—" : "— no email"}
                    </span>
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
                <td className="max-w-[220px] truncate px-4 py-3 text-xs text-muted">
                  {r.ua ?? "—"}
                </td>
                <td className="px-4 py-3 text-right">
                  <button
                    onClick={() => del(r.id, r.kind)}
                    disabled={deletingId === r.id}
                    title="Delete"
                    className="rounded-md border border-line p-1.5 text-muted transition-colors hover:border-red-500/40 hover:text-red-300 disabled:opacity-40"
                  >
                    <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none">
                      <path
                        d="M4 7h16M9 7V5a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2m2 0v12a1 1 0 0 1-1 1H7a1 1 0 0 1-1-1V7"
                        stroke="currentColor"
                        strokeWidth="1.7"
                        strokeLinecap="round"
                      />
                    </svg>
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function Th({ children }: { children?: React.ReactNode }) {
  return <th className="whitespace-nowrap px-4 py-3 font-medium">{children}</th>;
}

function TypeBadge({ kind }: { kind: "rating" | "tap" }) {
  const isTap = kind === "tap";
  return (
    <span
      className={`rounded-md border px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wider ${
        isTap
          ? "border-violet-200 bg-violet-50 text-violet-700"
          : "border-gold/70 bg-gold/15 text-ink"
      }`}
    >
      {isTap ? "Tap" : "Rating"}
    </span>
  );
}

function Meter({ n }: { n: number }) {
  return (
    <div className="flex items-center gap-2">
      <div className="flex gap-0.5">
        {[1, 2, 3, 4, 5].map((i) => (
          <span
            key={i}
            className={`h-3.5 w-1.5 rounded-full ${i <= n ? "bg-gold" : "bg-fill"}`}
          />
        ))}
      </div>
      <span className="font-mono text-xs font-semibold text-ink">{n}</span>
    </div>
  );
}

function Chip({ value, accent }: { value: string | null; accent?: boolean }) {
  if (!value) return <span className="text-xs text-muted/70">—</span>;
  return (
    <span
      className={`inline-block rounded-md border px-2 py-0.5 font-mono text-[11px] ${
        accent
          ? "border-sky-200 bg-sky-50 text-ink/70"
          : "border-line bg-white text-ink"
      }`}
    >
      {value}
    </span>
  );
}
