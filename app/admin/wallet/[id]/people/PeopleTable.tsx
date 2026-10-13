"use client";

import { useMemo, useState } from "react";

export type Person = {
  id: string;
  at: string;
  cardId: string | null;
  phone: string | null;
  answer: string | null;
  status: "opted_in" | "not_opted_in" | "stopped";
  consentText: string | null;
  consentedAt: string | null;
};

type Filter = "all" | "opted_in" | "not_opted_in" | "stopped";

const pacific = new Intl.DateTimeFormat("en-US", { timeZone: "America/Los_Angeles", month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });
const when = (iso: string) => pacific.format(new Date(iso));
const pretty = (p: string) => {
  const d = p.replace(/\D/g, "").replace(/^1/, "");
  return d.length === 10 ? `(${d.slice(0, 3)}) ${d.slice(3, 6)}-${d.slice(6)}` : p;
};
const masked = (p: string) => `(•••) •••-${p.slice(-4)}`;

const STATUS: Record<Person["status"], { label: string; cls: string }> = {
  opted_in: { label: "Opted in ✓", cls: "bg-emerald-50 text-emerald-700" },
  not_opted_in: { label: "Not opted in", cls: "bg-fill text-muted" },
  stopped: { label: "Texted STOP", cls: "bg-red-50 text-red-700" },
};

/** Filterable list of one campaign's people, with consent proof per row. */
export default function PeopleTable({ campaignId, people, question }: { campaignId: string; people: Person[]; question: string | null }) {
  const [filter, setFilter] = useState<Filter>("all");
  const [search, setSearch] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [showAll, setShowAll] = useState(false);
  const [revealed, setRevealed] = useState<Set<string>>(new Set());
  const [open, setOpen] = useState<string | null>(null);

  const counts = useMemo(
    () => ({
      all: people.length,
      withPhone: people.filter((p) => p.phone).length,
      opted_in: people.filter((p) => p.status === "opted_in").length,
      not_opted_in: people.filter((p) => p.status === "not_opted_in").length,
      stopped: people.filter((p) => p.status === "stopped").length,
    }),
    [people],
  );

  const shown = useMemo(() => {
    const digits = search.replace(/\D/g, "");
    return people.filter((p) => {
      if (filter !== "all" && p.status !== filter) return false;
      if (digits && !(p.phone ?? "").replace(/\D/g, "").includes(digits)) return false;
      const day = p.at.slice(0, 10);
      if (from && day < from) return false;
      if (to && day > to) return false;
      return true;
    });
  }, [people, filter, search, from, to]);

  function exportCsv() {
    const esc = (v: string | null) => {
      if (v == null) return "";
      const s = /^[=+\-@]/.test(v) && !/^\+?\d/.test(v) ? "'" + v : v;
      return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
    };
    const header = ["responded_at", "card", "phone", "status", question ? `answer: ${question}` : "answer", "consented_at", "consent_text"];
    const lines = shown.map((p) => [p.at, p.cardId, p.phone, STATUS[p.status].label, p.answer, p.consentedAt, p.consentText].map(esc).join(","));
    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob([[header.join(","), ...lines].join("\n")], { type: "text/csv" }));
    a.download = `people-${campaignId.slice(0, 8)}-${filter}.csv`;
    a.click();
    URL.revokeObjectURL(a.href);
  }

  const tab = (k: Filter, label: string, n: number) => (
    <button
      key={k}
      onClick={() => setFilter(k)}
      className={`shrink-0 rounded-full px-3.5 py-1.5 text-sm font-medium ${filter === k ? "bg-ink text-white" : "text-ink/70 hover:bg-fill hover:text-ink"}`}
    >
      {label} <span className="ml-1 font-mono text-xs opacity-70">{n}</span>
    </button>
  );
  const input = "h-9 rounded-lg border border-line bg-white px-2.5 text-sm text-ink outline-none focus:border-ink/40";

  return (
    <div className="mt-6 space-y-4">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Tile label="People" value={counts.all} sub="responded on the page" />
        <Tile label="Left a number" value={counts.withPhone} sub="phone numbers collected" />
        <Tile label="Can be texted" value={counts.opted_in} sub="opted in, never texted STOP" />
        <Tile label="Texted STOP" value={counts.stopped} sub="never text these numbers" />
      </div>

      <div className="rounded-2xl border border-line bg-white">
        <div className="flex flex-wrap items-center gap-2 border-b border-line p-3">
          <div className="flex gap-1 overflow-x-auto [scrollbar-width:none]">
            {tab("all", "All", counts.all)}
            {tab("opted_in", "Opted in", counts.opted_in)}
            {tab("not_opted_in", "Not opted in", counts.not_opted_in)}
            {tab("stopped", "Texted STOP", counts.stopped)}
          </div>
          <div className="ml-auto flex flex-wrap items-center gap-2">
            <input id="people-search" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search number…" inputMode="numeric" className={`${input} w-36`} />
            <input id="people-from" type="date" value={from} onChange={(e) => setFrom(e.target.value)} className={input} aria-label="From date" />
            <input id="people-to" type="date" value={to} onChange={(e) => setTo(e.target.value)} className={input} aria-label="To date" />
            <button onClick={() => setShowAll((v) => !v)} className="h-9 rounded-full border border-line px-3 text-xs font-semibold text-ink hover:border-ink/30">
              {showAll ? "Hide numbers" : "Show all numbers"}
            </button>
            <button onClick={exportCsv} disabled={shown.length === 0} className="h-9 rounded-full bg-ink px-3.5 text-xs font-semibold text-white hover:bg-ink-deep disabled:opacity-40">
              ↓ Export {shown.length} (CSV)
            </button>
          </div>
        </div>

        {shown.length === 0 ? (
          <p className="py-12 text-center text-sm text-muted">
            {people.length === 0 ? "No one has responded on this campaign's page yet." : "No one matches these filters."}
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-sm">
              <thead>
                <tr className="text-left text-xs font-semibold text-muted">
                  <th className="px-4 py-2.5">When</th>
                  <th className="px-4 py-2.5">Phone</th>
                  <th className="px-4 py-2.5">Status</th>
                  {question && <th className="px-4 py-2.5">{question}</th>}
                  <th className="px-4 py-2.5">Card</th>
                  <th className="px-4 py-2.5" />
                </tr>
              </thead>
              <tbody>
                {shown.map((p) => {
                  const show = showAll || revealed.has(p.id);
                  return (
                    <FragmentRow key={p.id} open={open === p.id} colSpan={question ? 6 : 5} detail={<Consent p={p} />}>
                      <td className="whitespace-nowrap px-4 py-3 text-muted">{when(p.at)}</td>
                      <td className="whitespace-nowrap px-4 py-3 font-mono text-ink">
                        {p.phone ? (
                          <>
                            {show ? pretty(p.phone) : masked(p.phone)}
                            {!showAll && (
                              <button
                                onClick={() => setRevealed((s) => { const n = new Set(s); if (n.has(p.id)) n.delete(p.id); else n.add(p.id); return n; })}
                                className="ml-2 font-sans text-[11px] font-semibold text-muted underline underline-offset-2 hover:text-ink"
                              >
                                {show ? "hide" : "show"}
                              </button>
                            )}
                          </>
                        ) : (
                          <span className="font-sans text-muted">—</span>
                        )}
                      </td>
                      <td className="px-4 py-3"><span className={`whitespace-nowrap rounded-full px-2 py-0.5 text-[11px] font-semibold ${STATUS[p.status].cls}`}>{STATUS[p.status].label}</span></td>
                      {question && <td className="max-w-[260px] px-4 py-3 text-ink">{p.answer ?? <span className="text-muted">—</span>}</td>}
                      <td className="whitespace-nowrap px-4 py-3 font-mono text-xs text-muted">{p.cardId ?? "—"}</td>
                      <td className="px-4 py-3 text-right">
                        <button onClick={() => setOpen(open === p.id ? null : p.id)} className="rounded-full border border-line px-2.5 py-1 text-[11px] font-medium text-ink/70 hover:border-ink/30 hover:text-ink">
                          {open === p.id ? "Close" : "Consent"}
                        </button>
                      </td>
                    </FragmentRow>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
      <p className="text-[11px] text-muted">Times in Pacific. Only text people marked “Opted in ✓”. Anyone who texts STOP moves to “Texted STOP” automatically.</p>
    </div>
  );
}

function FragmentRow({ children, open, colSpan, detail }: { children: React.ReactNode; open: boolean; colSpan: number; detail: React.ReactNode }) {
  return (
    <>
      <tr className="border-t border-line">{children}</tr>
      {open && (
        <tr className="bg-fill">
          <td colSpan={colSpan} className="px-4 py-3">{detail}</td>
        </tr>
      )}
    </>
  );
}

function Consent({ p }: { p: Person }) {
  if (p.status === "not_opted_in") return <p className="text-xs text-muted">They left {p.phone ? "a number" : "an answer"} but did not tick the texts box, so they can&apos;t be texted.</p>;
  return (
    <div className="text-xs leading-relaxed text-ink">
      <div><span className="font-semibold">Agreed:</span> {p.consentedAt ? when(p.consentedAt) : "—"} (Pacific), on this campaign&apos;s page{p.cardId ? `, from card ${p.cardId}` : ""}.</div>
      <div className="mt-1"><span className="font-semibold">Exact wording they ticked:</span> “{p.consentText ?? "—"}”</div>
      {p.status === "stopped" && <div className="mt-1 font-semibold text-red-700">They have since texted STOP. Never text this number.</div>}
    </div>
  );
}

function Tile({ label, value, sub }: { label: string; value: number; sub: string }) {
  return (
    <div className="rounded-2xl border border-line bg-white p-4">
      <div className="text-xs font-semibold text-muted">{label}</div>
      <div className="mt-1.5 font-display text-3xl font-bold tabular-nums text-ink">{value.toLocaleString()}</div>
      <div className="mt-1 text-xs text-muted">{sub}</div>
    </div>
  );
}
