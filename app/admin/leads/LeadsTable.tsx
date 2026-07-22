"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";

export type LeadRow = {
  id: string;
  ts: string;
  company: string;
  contactName: string;
  email: string;
  role: string | null;
  phone: string | null;
  website: string | null;
  interests: string[];
  campuses: string | null;
  timeline: string | null;
  budget: string | null;
  message: string | null;
  heardFrom: string | null;
  status: Status;
};

type Status = "new" | "contacted" | "qualified" | "closed";

const STATUSES: Status[] = ["new", "contacted", "qualified", "closed"];

const STATUS_STYLE: Record<Status, string> = {
  new: "border-[#FFCC00]/40 bg-[#FFCC00]/10 text-[#FFCC00]",
  contacted: "border-[#22D3EE]/30 bg-[#22D3EE]/10 text-[#7DE3FF]",
  qualified: "border-[#4ADE80]/30 bg-[#4ADE80]/10 text-[#86EFAC]",
  closed: "border-white/10 bg-white/5 text-[#8A94A6]",
};

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const pad = (n: number) => String(n).padStart(2, "0");

function fmtTs(ts: string) {
  const d = new Date(ts);
  return `${MONTHS[d.getUTCMonth()]} ${pad(d.getUTCDate())} · ${pad(d.getUTCHours())}:${pad(d.getUTCMinutes())}`;
}

export default function LeadsTable({ rows }: { rows: LeadRow[] }) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [tab, setTab] = useState<Status | "all">("all");
  const [openId, setOpenId] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  async function setStatus(id: string, status: Status) {
    setBusyId(id);
    await fetch(`/api/admin/leads/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    router.refresh();
    setBusyId(null);
  }

  async function del(id: string, company: string) {
    if (!confirm(`Delete the inquiry from ${company}? This cannot be undone.`)) return;
    setBusyId(id);
    await fetch(`/api/admin/leads/${id}`, { method: "DELETE" });
    router.refresh();
    setBusyId(null);
  }

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return rows.filter((r) => {
      if (tab !== "all" && r.status !== tab) return false;
      if (!q) return true;
      return [r.company, r.contactName, r.email, r.campuses, r.message, ...r.interests].some((v) =>
        v?.toLowerCase().includes(q),
      );
    });
  }, [rows, query, tab]);

  const csvHref = `/api/export?type=leads${tab !== "all" ? `&status=${tab}` : ""}`;

  return (
    <section className="rounded-2xl border border-white/10 bg-white/[0.02] backdrop-blur-sm">
      {/* toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/10 px-4 py-3.5">
        <div className="flex items-center gap-1 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {(["all", ...STATUSES] as const).map((t) => {
            const count = t === "all" ? rows.length : rows.filter((r) => r.status === t).length;
            return (
              <button
                key={t}
                onClick={() => setTab(t)}
                className={`shrink-0 whitespace-nowrap rounded-lg px-3 py-1.5 text-xs font-medium capitalize transition-colors ${
                  tab === t
                    ? "bg-white/10 text-white"
                    : "text-[#9AA6B8] hover:bg-white/5 hover:text-white"
                }`}
              >
                {t} <span className="ml-1 font-mono text-[10px] text-[#6B7688]">{count}</span>
              </button>
            );
          })}
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
              placeholder="Search company / contact / email"
              className="h-9 w-64 max-w-[60vw] rounded-lg border border-white/10 bg-white/5 pl-8 pr-3 text-xs text-white outline-none transition-colors placeholder:text-[#5A6577] focus:border-[#FFCC00]/50"
            />
          </div>
          <a
            href={csvHref}
            className="flex h-9 items-center gap-1.5 rounded-lg border border-[#FFCC00]/30 bg-[#FFCC00]/10 px-3 text-xs font-semibold text-[#FFCC00] transition-colors hover:bg-[#FFCC00]/20"
            title={tab === "all" ? "Download every inquiry" : `Download ${tab} inquiries`}
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

      {filtered.length === 0 ? (
        <p className="px-4 py-12 text-center text-sm text-[#6B7688]">
          {rows.length === 0 ? "No inquiries yet." : "No matches."}
        </p>
      ) : (
        <ul>
          {filtered.map((r) => {
            const open = openId === r.id;
            return (
              <li key={r.id} className="border-t border-white/[0.06]">
                {/* summary row — click anywhere to expand */}
                <div
                  onClick={() => setOpenId(open ? null : r.id)}
                  className="flex cursor-pointer flex-wrap items-center gap-x-4 gap-y-2 px-4 py-3.5 transition-colors hover:bg-white/[0.03]"
                >
                  <svg
                    className={`h-3.5 w-3.5 shrink-0 text-[#6B7688] transition-transform ${open ? "rotate-90" : ""}`}
                    viewBox="0 0 24 24"
                    fill="none"
                  >
                    <path
                      d="m9 6 6 6-6 6"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>

                  <div className="min-w-0 flex-1">
                    <div className="truncate font-display text-sm font-semibold text-white">
                      {r.company}
                    </div>
                    <div className="mt-0.5 truncate text-xs text-[#9AA6B8]">
                      {r.contactName}
                      {r.role ? ` · ${r.role}` : ""} · {r.email}
                    </div>
                  </div>

                  <div className="hidden max-w-[240px] flex-wrap gap-1 lg:flex">
                    {r.interests.slice(0, 2).map((i) => (
                      <Chip key={i}>{i}</Chip>
                    ))}
                    {r.interests.length > 2 && <Chip>+{r.interests.length - 2}</Chip>}
                  </div>

                  <span className="hidden shrink-0 font-mono text-[11px] text-[#6B7688] sm:block">
                    {fmtTs(r.ts)}
                  </span>

                  <div onClick={(e) => e.stopPropagation()} className="shrink-0">
                    <select
                      value={r.status}
                      disabled={busyId === r.id}
                      onChange={(e) => setStatus(r.id, e.target.value as Status)}
                      className={`cursor-pointer rounded-md border px-2 py-1 text-[10px] font-semibold uppercase tracking-wider outline-none disabled:opacity-50 ${STATUS_STYLE[r.status]}`}
                    >
                      {STATUSES.map((s) => (
                        <option key={s} value={s} className="bg-[#0E1420] text-white">
                          {s}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* detail panel */}
                {open && (
                  <div className="border-t border-white/[0.06] bg-black/20 px-4 py-5 sm:px-11">
                    <dl className="grid gap-x-8 gap-y-4 sm:grid-cols-2 lg:grid-cols-3">
                      <Detail label="Received">{fmtTs(r.ts)} UTC</Detail>
                      <Detail label="Email">
                        <a href={`mailto:${r.email}`} className="text-[#7DE3FF] hover:underline">
                          {r.email}
                        </a>
                      </Detail>
                      <Detail label="Phone">{r.phone}</Detail>
                      <Detail label="Website">
                        {r.website ? (
                          <a
                            href={r.website.startsWith("http") ? r.website : `https://${r.website}`}
                            target="_blank"
                            rel="noreferrer noopener"
                            className="text-[#7DE3FF] hover:underline"
                          >
                            {r.website}
                          </a>
                        ) : null}
                      </Detail>
                      <Detail label="Timeline">{r.timeline}</Detail>
                      <Detail label="Budget">{r.budget}</Detail>
                      <Detail label="Campuses / markets">{r.campuses}</Detail>
                      <Detail label="Heard about us">{r.heardFrom}</Detail>
                      <Detail label="Interested in">
                        {r.interests.length ? (
                          <span className="flex flex-wrap gap-1">
                            {r.interests.map((i) => (
                              <Chip key={i}>{i}</Chip>
                            ))}
                          </span>
                        ) : null}
                      </Detail>
                    </dl>

                    {r.message && (
                      <div className="mt-5 rounded-xl border-l-2 border-[#FFCC00]/60 bg-white/[0.03] px-4 py-3">
                        <div className="text-[10px] uppercase tracking-[0.14em] text-[#6B7688]">
                          Message
                        </div>
                        <p className="mt-1.5 whitespace-pre-wrap text-sm leading-relaxed text-[#E5E9F0]">
                          {r.message}
                        </p>
                      </div>
                    )}

                    <div className="mt-5 flex items-center gap-2">
                      <a
                        href={`mailto:${r.email}?subject=${encodeURIComponent(`Campus Run × ${r.company}`)}`}
                        className="rounded-lg bg-[#FFCC00] px-3.5 py-1.5 text-xs font-bold text-[#0A1420] transition-colors hover:bg-[#FFD633]"
                      >
                        Reply by email
                      </a>
                      <button
                        onClick={() => del(r.id, r.company)}
                        disabled={busyId === r.id}
                        className="rounded-lg border border-white/10 px-3.5 py-1.5 text-xs font-medium text-[#6B7688] transition-colors hover:border-red-500/40 hover:text-red-300 disabled:opacity-50"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}

function Detail({ label, children }: { label: string; children?: React.ReactNode }) {
  const empty = children === null || children === undefined || children === "";
  return (
    <div>
      <dt className="text-[10px] uppercase tracking-[0.14em] text-[#6B7688]">{label}</dt>
      <dd className={`mt-1 text-sm ${empty ? "text-[#4A5468]" : "text-[#E5E9F0]"}`}>
        {empty ? "—" : children}
      </dd>
    </div>
  );
}

function Chip({ children }: { children: React.ReactNode }) {
  return (
    <span className="inline-block rounded-md border border-white/10 bg-white/5 px-2 py-0.5 text-[11px] text-[#C3CBD9]">
      {children}
    </span>
  );
}
