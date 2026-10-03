import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { and, desc, eq, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import { smsEntries, smsMessages, smsPrograms, walletCampaigns } from "@/lib/db/schema";
import { requireAdmin } from "@/lib/auth/session";
import { siteUrl } from "@/lib/campaigns";
import AdminShell from "../../AdminShell";
import ProgramTools from "./ProgramTools";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Text giveaway · Campus Run" };

const pacific = new Intl.DateTimeFormat("en-US", { timeZone: "America/Los_Angeles", month: "numeric", day: "numeric", hour: "numeric", minute: "2-digit" });
const fmt = (d: Date | null) => (d ? pacific.format(d).replace(",", "") : "—");
// Phone numbers stay masked on screen; the internal CSV and the winner draw show them in full.
const mask = (p: string) => `•••-•••-${p.slice(-4)}`;

export default async function SmsProgramPage({ params }: { params: Promise<{ id: string }> }) {
  const admin = await requireAdmin();
  const { id } = await params;
  const [program] = await db.select().from(smsPrograms).where(eq(smsPrograms.id, id)).limit(1);
  if (!program) notFound();

  const [entries, [stats], messages, campaign] = await Promise.all([
    db.select().from(smsEntries).where(eq(smsEntries.programId, id)).orderBy(desc(smsEntries.enteredAt)).limit(200),
    db
      .select({
        entries: sql<number>`count(*)::int`,
        answered: sql<number>`count(answer)::int`,
      })
      .from(smsEntries)
      .where(eq(smsEntries.programId, id)),
    db.select().from(smsMessages).where(eq(smsMessages.programId, id)).orderBy(desc(smsMessages.createdAt)).limit(40),
    program.walletCampaignId
      ? db.select({ id: walletCampaigns.id, brand: walletCampaigns.brand, name: walletCampaigns.name }).from(walletCampaigns).where(eq(walletCampaigns.id, program.walletCampaignId)).then((r) => r[0] ?? null)
      : Promise.resolve(null),
  ]);
  const [sent] = await db
    .select({ n: sql<number>`count(*)::int` })
    .from(smsMessages)
    .where(and(eq(smsMessages.programId, id), eq(smsMessages.direction, "out")));

  const number = process.env.TWILIO_PHONE_NUMBER ?? null;
  const twilioReady = Boolean(process.env.TWILIO_AUTH_TOKEN);
  const passLink = number ? `sms:${number}&body=${encodeURIComponent(program.keyword)}` : null;
  const answerRate = stats.entries ? Math.round((stats.answered / stats.entries) * 100) : 0;

  return (
    <AdminShell name={admin.name} role={admin.role}>
      <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
        <div>
          <Link href="/admin/sms" className="text-xs font-medium text-muted hover:text-ink">← All text giveaways</Link>
          <h1 className="mt-1 font-display text-2xl font-bold tracking-[-0.01em] text-ink">{program.name}</h1>
          <p className="mt-1 flex flex-wrap items-center gap-2 text-sm text-muted">
            Keyword <code className="rounded-md bg-white px-1.5 py-0.5 font-mono text-ink">{program.keyword}</code>
            <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${program.open ? "bg-emerald-50 text-emerald-700" : "bg-line text-muted"}`}>
              {program.open ? "Open for entries" : "Closed"}
            </span>
            {campaign && (
              <Link href={`/admin/wallet/${campaign.id}`} className="underline underline-offset-2 hover:text-ink">
                {campaign.brand} — {campaign.name}
              </Link>
            )}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <a href={`/api/export?type=sms&program=${id}&mode=brand`} className="rounded-full bg-ink px-4 py-2 text-sm font-semibold text-white hover:bg-ink-deep">
            ↓ Entries for the brand (no phones)
          </a>
          <a href={`/api/export?type=sms&program=${id}&mode=internal`} className="rounded-full border border-line bg-white px-4 py-2 text-sm font-medium text-ink hover:border-ink/30">
            ↓ Internal (with phones)
          </a>
        </div>
      </div>

      {/* connection status */}
      <section className="mb-8 grid gap-3 sm:grid-cols-3">
        <Status ok={twilioReady} label="Twilio connected" hint={twilioReady ? "Incoming texts are verified and recorded." : "Add TWILIO_AUTH_TOKEN in Vercel once the number is approved."} />
        <Status ok={Boolean(number)} label="Phone number" hint={number ?? "Add TWILIO_PHONE_NUMBER in Vercel (e.g. +18558517300)."} />
        <div className="rounded-2xl border border-line bg-white p-4">
          <div className="text-sm font-semibold text-ink">Link for the pass&apos;s giveaway button</div>
          {passLink ? (
            <code className="mt-1 block break-all font-mono text-[11px] text-ink/80">{passLink}</code>
          ) : (
            <p className="mt-1 text-xs text-muted">Appears once the phone number is set.</p>
          )}
          <p className="mt-1 text-[11px] text-muted">Paste into the designer → Buttons &amp; links → Giveaway.</p>
        </div>
      </section>

      {/* numbers */}
      <section className="mb-8 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat label="Entries" value={stats.entries} sub="one per phone number" />
        <Stat label="Answered the question" value={stats.answered} sub={`${answerRate}% of entries`} />
        <Stat label="Texts we sent" value={sent.n} sub={`≈ $${(sent.n * 0.011).toFixed(2)} incl. carrier fees`} />
        <Stat label="Entries this page shows" value={Math.min(entries.length, 200)} sub="newest 200 · full list in the CSVs" />
      </section>

      <ProgramTools
        id={id}
        open={program.open}
        keyword={program.keyword}
        question={program.question}
        replies={{
          replyEntry: program.replyEntry,
          replyAnswer: program.replyAnswer,
          replyWrongKeyword: program.replyWrongKeyword,
          replyHelp: program.replyHelp,
          replyClosed: program.replyClosed,
        }}
      />

      <div className="mt-8 grid gap-6 lg:grid-cols-2">
        <section className="rounded-2xl border border-line bg-white p-4">
          <h2 className="mb-3 text-sm font-semibold text-ink">Entries <span className="font-normal text-muted">· newest first</span></h2>
          {entries.length === 0 ? (
            <p className="text-sm text-muted">No entries yet.</p>
          ) : (
            <table className="w-full border-collapse text-xs">
              <thead>
                <tr className="text-left text-muted">
                  <th className="py-1.5 font-semibold">Entered</th>
                  <th className="py-1.5 font-semibold">Phone</th>
                  <th className="py-1.5 font-semibold">Answer</th>
                </tr>
              </thead>
              <tbody>
                {entries.map((e) => (
                  <tr key={e.id} className="border-t border-line align-top">
                    <td className="whitespace-nowrap py-2 pr-3 font-mono text-muted">{fmt(e.enteredAt)}</td>
                    <td className="whitespace-nowrap py-2 pr-3 font-mono text-ink">{mask(e.phone)}</td>
                    <td className="py-2 text-ink">{e.answer ?? <span className="text-muted">—</span>}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </section>

        <section className="rounded-2xl border border-line bg-white p-4">
          <h2 className="mb-3 text-sm font-semibold text-ink">Texts we sent <span className="font-normal text-muted">· last 40</span></h2>
          {messages.length === 0 ? (
            <p className="text-sm text-muted">Nothing sent yet.</p>
          ) : (
            <ul className="space-y-2 text-xs">
              {messages.map((m) => (
                <li key={m.id} className="border-t border-line pt-2 first:border-t-0 first:pt-0">
                  <div className="flex justify-between gap-2 text-muted">
                    <span className="font-mono">{fmt(m.createdAt)} · {mask(m.phone)}</span>
                    <span className="rounded-full bg-fill px-1.5 py-0.5 text-[10px] font-semibold">{m.kind?.replace("_", " ")}</span>
                  </div>
                  <p className="mt-0.5 text-ink">{m.body}</p>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>

      <p className="mt-6 text-[11px] text-muted">Webhook for the Twilio number: <code className="font-mono">{siteUrl()}/api/sms/inbound</code> (HTTP POST)</p>
    </AdminShell>
  );
}

function Status({ ok, label, hint }: { ok: boolean; label: string; hint: string }) {
  return (
    <div className={`rounded-2xl border p-4 ${ok ? "border-line bg-white" : "border-gold bg-gold/10"}`}>
      <div className="flex items-center gap-2 text-sm font-semibold text-ink">
        <span className={`flex h-5 w-5 items-center justify-center rounded-full text-[11px] ${ok ? "bg-ink text-white" : "border border-ink/30"}`}>{ok ? "✓" : "!"}</span>
        {label}
      </div>
      <p className="mt-1 break-all text-xs text-muted">{hint}</p>
    </div>
  );
}

function Stat({ label, value, sub }: { label: string; value: number; sub: string }) {
  return (
    <div className="rounded-2xl border border-line bg-white p-4">
      <div className="text-xs font-semibold text-muted">{label}</div>
      <div className="mt-1.5 font-display text-3xl font-bold tabular-nums text-ink">{value.toLocaleString()}</div>
      <div className="mt-1 text-xs text-muted">{sub}</div>
    </div>
  );
}
