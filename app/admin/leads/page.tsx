import type { Metadata } from "next";
import { desc, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import { leads } from "@/lib/db/schema";
import { requireAdmin } from "@/lib/auth/session";
import { emailConfigured } from "@/lib/email";
import AdminShell from "../AdminShell";
import LeadsTable, { type LeadRow } from "./LeadsTable";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Intake · Campus Run" };

const LIMIT = 1000;

export default async function LeadsPage() {
  const admin = await requireAdmin();

  const [[stats], rows] = await Promise.all([
    db
      .select({
        total: sql<number>`count(*)::int`,
        fresh: sql<number>`count(*) filter (where status = 'new')::int`,
        qualified: sql<number>`count(*) filter (where status = 'qualified')::int`,
        week: sql<number>`count(*) filter (where created_at > now() - interval '7 days')::int`,
      })
      .from(leads),
    db.select().from(leads).orderBy(desc(leads.createdAt)).limit(LIMIT),
  ]);

  const items: LeadRow[] = rows.map((r) => ({
    id: r.id,
    ts: r.createdAt.toISOString(),
    company: r.company,
    contactName: r.contactName,
    email: r.email,
    role: r.role,
    phone: r.phone,
    website: r.website,
    interests: r.interests,
    campuses: r.campuses,
    timeline: r.timeline,
    budget: r.budget,
    message: r.message,
    heardFrom: r.heardFrom,
    status: r.status,
  }));

  return (
    <AdminShell name={admin.name} role={admin.role}>
      <div className="mb-6">
        <h1 className="font-display text-xl font-bold text-white">Intake</h1>
        <p className="mt-1 text-sm text-[#9AA6B8]">
          Inquiries from{" "}
          <code className="rounded bg-white/5 px-1.5 py-0.5 font-mono text-xs text-[#7DE3FF]">
            /work-with-us
          </code>
        </p>
      </div>

      <section className="mb-8 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat label="New" value={stats.fresh.toLocaleString()} accent />
        <Stat label="Last 7 days" value={stats.week.toLocaleString()} />
        <Stat label="Qualified" value={stats.qualified.toLocaleString()} />
        <Stat label="Total" value={stats.total.toLocaleString()} />
      </section>

      {!emailConfigured && (
        <p className="mb-6 rounded-xl border border-[#FFCC00]/20 bg-[#FFCC00]/[0.06] px-4 py-3 text-xs text-[#E3C878]">
          Email notifications are off — set the SMTP_* and LEAD_NOTIFY_TO environment
          variables to get an email on every new inquiry. Everything is still saved here.
        </p>
      )}

      <LeadsTable rows={items} />
    </AdminShell>
  );
}

function Stat({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4 backdrop-blur-sm">
      <div className="text-[10px] font-medium uppercase tracking-[0.18em] text-[#6B7688]">
        {label}
      </div>
      <div className="mt-2">
        <span
          className={`font-display text-2xl font-bold tabular-nums ${accent ? "text-[#FFCC00]" : "text-white"}`}
        >
          {value}
        </span>
      </div>
    </div>
  );
}
