import type { Metadata } from "next";
import { desc, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import { submissions } from "@/lib/db/schema";
import { requireAdmin } from "@/lib/auth/session";
import SubmissionsTable from "./SubmissionsTable";
import LogoutButton from "./LogoutButton";

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
    <div className="relative min-h-dvh overflow-hidden bg-[#070B14] text-[#E5E9F0]">
      {/* futuristic backdrop */}
      <div
        className="pointer-events-none fixed inset-0 opacity-[0.10]"
        style={{
          backgroundImage:
            "linear-gradient(#1C2636 1px, transparent 1px), linear-gradient(90deg, #1C2636 1px, transparent 1px)",
          backgroundSize: "48px 48px",
        }}
      />
      <div className="pointer-events-none fixed -left-40 -top-40 h-[28rem] w-[28rem] rounded-full bg-[#FFCC00]/10 blur-[140px]" />
      <div className="pointer-events-none fixed -bottom-40 right-0 h-[28rem] w-[28rem] rounded-full bg-[#22D3EE]/8 blur-[140px]" />

      <header className="sticky top-0 z-20 border-b border-white/10 bg-[#070B14]/80 backdrop-blur-xl">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
          <div className="flex items-center gap-2.5">
            <span className="font-display text-lg font-bold tracking-tight text-white">
              CAMPUS RUN
            </span>
            <span className="rounded-md border border-[#FFCC00]/30 bg-[#FFCC00]/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.22em] text-[#FFCC00]">
              Ops
            </span>
          </div>
          <div className="flex items-center gap-4">
            <div className="text-right leading-tight">
              <div className="text-xs font-medium text-white">{admin.name}</div>
              <div className="text-[10px] uppercase tracking-wider text-[#6B7688]">
                {admin.role}
              </div>
            </div>
            <LogoutButton />
          </div>
        </div>
      </header>

      <main className="relative z-10 mx-auto max-w-7xl px-6 py-8">
        <section className="mb-8 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
          <Stat label="Total taps" value={stats.total.toLocaleString()} accent />
          <Stat label="Avg stoke" value={stats.avgRating.toFixed(1)} suffix="/5" />
          <Stat label="Today" value={stats.today.toLocaleString()} />
          <Stat label="With email" value={`${emailRate}%`} />
          <Stat label="Brands" value={stats.brands.toLocaleString()} />
          <Stat label="Drops" value={stats.events.toLocaleString()} />
        </section>

        <SubmissionsTable rows={rows} total={stats.total} shown={rows.length} />
      </main>
    </div>
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
