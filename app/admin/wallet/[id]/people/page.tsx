import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { desc, eq, inArray } from "drizzle-orm";
import { db } from "@/lib/db";
import { offerClaims, smsOptOuts, walletCampaigns } from "@/lib/db/schema";
import { requireAdmin } from "@/lib/auth/session";
import { offerPageSchema } from "@/lib/offer";
import AdminShell from "../../../AdminShell";
import PeopleTable, { type Person } from "./PeopleTable";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "People · Campus Run" };

/**
 * One campaign's people: everyone who left a number or answered on its offer page, with
 * their opt-in status and proof of consent. Strictly per campaign — numbers collected for
 * one brand are never shown, exported or texted under another.
 */
export default async function PeoplePage({ params }: { params: Promise<{ id: string }> }) {
  const admin = await requireAdmin();
  const { id } = await params;
  const [campaign] = await db
    .select({ id: walletCampaigns.id, brand: walletCampaigns.brand, name: walletCampaigns.name, offerPage: walletCampaigns.offerPage })
    .from(walletCampaigns)
    .where(eq(walletCampaigns.id, id))
    .limit(1);
  if (!campaign) notFound();

  const rows = await db.select().from(offerClaims).where(eq(offerClaims.campaignId, id)).orderBy(desc(offerClaims.createdAt));
  const phones = [...new Set(rows.map((r) => r.phone).filter((p): p is string => Boolean(p)))];
  const stopped = phones.length
    ? new Set((await db.select({ phone: smsOptOuts.phone }).from(smsOptOuts).where(inArray(smsOptOuts.phone, phones))).map((o) => o.phone))
    : new Set<string>();
  const question = offerPageSchema.safeParse(campaign.offerPage);

  const people: Person[] = rows.map((r) => ({
    id: r.id,
    at: r.createdAt.toISOString(),
    cardId: r.cardId,
    phone: r.phone,
    answer: r.answer,
    // Texted STOP since opting in → never text them, whatever the box said.
    status: r.phone && stopped.has(r.phone) ? "stopped" : r.smsOptIn ? "opted_in" : "not_opted_in",
    consentText: r.consentText,
    consentedAt: r.consentedAt?.toISOString() ?? null,
  }));

  return (
    <AdminShell name={admin.name} role={admin.role}>
      <Link href={`/admin/wallet/${id}`} className="text-xs font-medium text-muted hover:text-ink">← Back to campaign</Link>
      <h1 className="mt-1 font-display text-2xl font-bold tracking-[-0.01em] text-ink">People</h1>
      <p className="mt-1 text-sm text-muted">
        <span className="font-semibold text-ink">{campaign.brand}</span> · {campaign.name} — only this campaign&apos;s people. Phone numbers are
        hidden until you show them, and are never in the brand&apos;s CSV.
      </p>
      <PeopleTable campaignId={id} people={people} question={question.success ? question.data.question : null} />
    </AdminShell>
  );
}
