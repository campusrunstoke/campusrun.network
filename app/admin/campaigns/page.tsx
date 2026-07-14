import type { Metadata } from "next";
import { desc, sql } from "drizzle-orm";
import QRCode from "qrcode";
import { db } from "@/lib/db";
import { campaigns, submissions, taps } from "@/lib/db/schema";
import { requireAdmin } from "@/lib/auth/session";
import { trackingUrl } from "@/lib/campaigns";
import AdminShell from "../AdminShell";
import NewCampaignForm from "./NewCampaignForm";
import CampaignsList from "./CampaignsList";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Campaigns · Campus Run" };

export default async function CampaignsPage() {
  const admin = await requireAdmin();

  const [rows, subRows, tapRows] = await Promise.all([
    db.select().from(campaigns).orderBy(desc(campaigns.createdAt)),
    db
      .select({
        brand: submissions.brand,
        eventId: submissions.eventId,
        n: sql<number>`count(*)::int`,
        avg: sql<number>`coalesce(avg(rating),0)::float`,
      })
      .from(submissions)
      .groupBy(submissions.brand, submissions.eventId),
    db
      .select({ campaignId: taps.campaignId, n: sql<number>`count(*)::int` })
      .from(taps)
      .groupBy(taps.campaignId),
  ]);

  const subMap = new Map(subRows.map((r) => [`${r.brand}|${r.eventId}`, r]));
  const tapMap = new Map(tapRows.filter((r) => r.campaignId).map((r) => [r.campaignId, r.n]));

  const items = await Promise.all(
    rows.map(async (c) => {
      const url = trackingUrl(c);
      const sub = subMap.get(`${c.brand}|${c.eventId}`);
      return {
        id: c.id,
        name: c.name,
        type: c.type,
        destinationUrl: c.destinationUrl,
        brand: c.brand,
        eventId: c.eventId,
        cardNumber: c.cardNumber,
        active: c.active,
        url,
        qr: await QRCode.toDataURL(url, {
          margin: 1,
          width: 220,
          color: { dark: "#0A1420", light: "#ffffff" },
        }),
        submissions: sub?.n ?? 0,
        avgRating: sub?.avg ?? 0,
        taps: tapMap.get(c.id) ?? 0,
      };
    }),
  );

  return (
    <AdminShell name={admin.name} role={admin.role}>
      <div className="mb-6">
        <h1 className="font-display text-xl font-bold text-white">Campaigns</h1>
        <p className="text-sm text-[#6B7688]">
          One link per drop — copy it onto the client&apos;s NFC card.
        </p>
      </div>

      <NewCampaignForm />
      <CampaignsList items={items} />
    </AdminShell>
  );
}
