import type { Metadata } from "next";
import { desc, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import { submissions } from "@/lib/db/schema";
import { requireAdmin } from "@/lib/auth/session";
import SubmissionsTable from "./SubmissionsTable";
import AdminShell from "./AdminShell";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Ops · Campus Run" };

const LIMIT = 1000;

export default async function AdminPage() {
  const admin = await requireAdmin();

  const [[stats], raw] = await Promise.all([
    db
      .select({
        total: sql<number>`count(*)::int`,
        avgRating: sql<number>`coalesce(avg(rating), 0)::float`,
        withEmail: sql<number>`count(*) filter (where email is not null)::int`,
        today: sql<number>`count(*) filter (where created_at >= date_trunc('day', now()))::int`,
        brands: sql<number>`count(distinct brand)::int`,
        events: sql<number>`count(distinct event_id)::int`,
      })
      .from(submissions),
    db.select().from(submissions).orderBy(desc(submissions.createdAt)).limit(LIMIT),
  ]);

  const rows = raw.map((r) => ({
    id: r.id,
    ts: r.createdAt.toISOString(),
    rating: r.rating,
    email: r.email,
    e: r.eventId,
    b: r.brand,
    c: r.cardNumber,
    ua: r.userAgent,
  }));

  const emailRate = stats.total ? Math.round((stats.withEmail / stats.total) * 100) : 0;

  return (
    <AdminShell name={admin.name} role={admin.role}>
      <section className="mb-8 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        <Stat label="Total taps" value={stats.total.toLocaleString()} accent />
        <Stat label="Avg stoke" value={stats.avgRating.toFixed(1)} suffix="/5" />
        <Stat label="Today" value={stats.today.toLocaleString()} />
        <Stat label="With email" value={`${emailRate}%`} />
        <Stat label="Brands" value={stats.brands.toLocaleString()} />
        <Stat label="Drops" value={stats.events.toLocaleString()} />
      </section>

      <SubmissionsTable rows={rows} total={stats.total} shown={rows.length} />
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
