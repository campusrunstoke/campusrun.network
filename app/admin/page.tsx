import type { Metadata } from "next";
import { desc, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import { submissions, taps } from "@/lib/db/schema";
import { requireAdmin } from "@/lib/auth/session";
import SubmissionsTable from "./SubmissionsTable";
import AdminShell from "./AdminShell";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Ops · Campus Run" };

const LIMIT = 1000;

export default async function AdminPage() {
  const admin = await requireAdmin();

  const [[stats], [tapStats], subRows, tapRows] = await Promise.all([
    db
      .select({
        total: sql<number>`count(*)::int`,
        avgRating: sql<number>`coalesce(avg(rating),0)::float`,
        withEmail: sql<number>`count(*) filter (where email is not null)::int`,
        brands: sql<number>`count(distinct brand)::int`,
        events: sql<number>`count(distinct event_id)::int`,
      })
      .from(submissions),
    db.select({ total: sql<number>`count(*)::int` }).from(taps),
    db.select().from(submissions).orderBy(desc(submissions.createdAt)).limit(LIMIT),
    db.select().from(taps).orderBy(desc(taps.createdAt)).limit(LIMIT),
  ]);

  // Unified activity feed: rating submissions + redirect taps, newest first.
  const rows = [
    ...subRows.map((r) => ({
      kind: "rating" as const,
      id: r.id,
      ts: r.createdAt.toISOString(),
      rating: r.rating as number | null,
      email: r.email,
      e: r.eventId,
      b: r.brand,
      c: r.cardNumber,
      ua: r.userAgent,
    })),
    ...tapRows.map((r) => ({
      kind: "tap" as const,
      id: r.id,
      ts: r.createdAt.toISOString(),
      rating: null,
      email: null,
      e: r.eventId,
      b: r.brand,
      c: r.cardNumber,
      ua: r.userAgent,
    })),
  ]
    .sort((a, b) => (a.ts < b.ts ? 1 : -1))
    .slice(0, LIMIT);

  const emailRate = stats.total ? Math.round((stats.withEmail / stats.total) * 100) : 0;
  const totalEvents = stats.total + tapStats.total;

  return (
    <AdminShell name={admin.name} role={admin.role}>
      <section className="mb-8 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        <Stat label="Ratings" value={stats.total.toLocaleString()} accent />
        <Stat label="Taps" value={tapStats.total.toLocaleString()} accent />
        <Stat label="Avg stoke" value={stats.avgRating.toFixed(1)} suffix="/5" />
        <Stat label="With email" value={`${emailRate}%`} />
        <Stat label="Brands" value={stats.brands.toLocaleString()} />
        <Stat label="Drops" value={stats.events.toLocaleString()} />
      </section>

      <SubmissionsTable rows={rows} total={totalEvents} shown={rows.length} />
    </AdminShell>
  );
}

function Stat({
  label,
  value,
  suffix,
  accent,
}: {
  label: string;
  value: string;
  suffix?: string;
  accent?: boolean;
}) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4 backdrop-blur-sm">
      <div className="text-[10px] font-medium uppercase tracking-[0.18em] text-[#6B7688]">
        {label}
      </div>
      <div className="mt-2 flex items-baseline gap-1">
        <span
          className={`font-display text-2xl font-bold tabular-nums ${accent ? "text-[#FFCC00]" : "text-white"}`}
        >
          {value}
        </span>
        {suffix && <span className="text-xs text-[#6B7688]">{suffix}</span>}
      </div>
    </div>
  );
}
