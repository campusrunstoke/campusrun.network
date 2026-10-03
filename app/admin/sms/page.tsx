import type { Metadata } from "next";
import Link from "next/link";
import { desc, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import { smsEntries, smsPrograms, walletCampaigns } from "@/lib/db/schema";
import { requireAdmin } from "@/lib/auth/session";
import AdminShell from "../AdminShell";
import NewSmsProgramForm from "./NewSmsProgramForm";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Text giveaways · Campus Run" };

export default async function SmsPage() {
  const admin = await requireAdmin();
  const [programs, counts, campaigns] = await Promise.all([
    db.select().from(smsPrograms).orderBy(desc(smsPrograms.createdAt)),
    db
      .select({
        programId: smsEntries.programId,
        entries: sql<number>`count(*)::int`,
        answered: sql<number>`count(answer)::int`,
      })
      .from(smsEntries)
      .groupBy(smsEntries.programId),
    db.select({ id: walletCampaigns.id, brand: walletCampaigns.brand, name: walletCampaigns.name }).from(walletCampaigns).orderBy(desc(walletCampaigns.createdAt)),
  ]);
  const byId = new Map(counts.map((c) => [c.programId, c]));
  const twilioReady = Boolean(process.env.TWILIO_AUTH_TOKEN);

  return (
    <AdminShell name={admin.name} role={admin.role}>
      <div className="mb-6">
        <h1 className="font-display text-2xl font-bold tracking-[-0.01em] text-ink">Text giveaways</h1>
        <p className="mt-1 max-w-2xl text-sm text-muted">
          A student texts a keyword to our number — that text is their entry. We reply once with a bonus question,
          and whatever they send back is saved as their answer. One entry per phone number.
        </p>
      </div>

      {!twilioReady && (
        <p className="mb-6 rounded-2xl border border-gold bg-gold/10 px-4 py-3 text-xs text-ink">
          Twilio isn&apos;t connected yet, so real texts can&apos;t arrive. You can still set up giveaways and try them
          with the text simulator on each giveaway&apos;s page.
        </p>
      )}

      <NewSmsProgramForm campaigns={campaigns} />

      {programs.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-line bg-white py-16 text-center text-sm text-muted">
          No text giveaways yet.
        </div>
      ) : (
        <section className="overflow-x-auto rounded-2xl border border-line bg-white">
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr className="border-b border-line text-left text-xs font-semibold text-muted">
                <th className="px-4 py-3">Giveaway</th>
                <th className="px-4 py-3">Keyword</th>
                <th className="px-4 py-3 text-right">Entries</th>
                <th className="px-4 py-3 text-right">Answered</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody>
              {programs.map((p) => {
                const c = byId.get(p.id);
                return (
                  <tr key={p.id} className="border-t border-line first:border-t-0 hover:bg-fill">
                    <td className="px-4 py-3">
                      <Link href={`/admin/sms/${p.id}`} className="font-semibold text-ink">{p.name}</Link>
                      <span className={`ml-2 rounded-full px-1.5 py-0.5 text-[10px] font-semibold ${p.open ? "bg-emerald-50 text-emerald-700" : "bg-line text-muted"}`}>
                        {p.open ? "Open" : "Closed"}
                      </span>
                    </td>
                    <td className="px-4 py-3 font-mono text-xs text-ink">{p.keyword}</td>
                    <td className="px-4 py-3 text-right font-mono text-xs tabular-nums text-ink">{c?.entries ?? 0}</td>
                    <td className="px-4 py-3 text-right font-mono text-xs tabular-nums text-muted">
                      {c?.entries ? `${Math.round(((c.answered ?? 0) / c.entries) * 100)}%` : "—"}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <Link href={`/admin/sms/${p.id}`} className="rounded-full border border-line px-3 py-1 text-xs font-medium text-ink/70 hover:border-ink/30 hover:text-ink">
                        Open
                      </Link>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </section>
      )}
    </AdminShell>
  );
}
