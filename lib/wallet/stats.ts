import { and, desc, eq, gte, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import { passes, walletCampaigns, walletCards, walletEvents } from "@/lib/db/schema";

/**
 * Every dashboard number (§6), computed straight off wallet_events so the dashboard
 * and the CSV can never disagree. All per-campaign — client logins later just scope
 * these same queries.
 */

export type Funnel = {
  taps: number; // raw tap events (double-taps count)
  people: number; // distinct cards tapped = distinct people reached
  passesAdded: number;
  clicks: number; // raw click events
  clickers: number; // distinct passes that clicked at least once
  redemptions: number; // one per pass, guarded at write time
};

const pct = (n: number, d: number) => (d ? Math.round((n / d) * 1000) / 10 : 0);

/**
 * Conversion at each funnel step (§6). Every rate uses PEOPLE REACHED (distinct cards
 * tapped) as the denominator: a web-coupon user can click or redeem without ever
 * adding a pass, so "redemptions ÷ passes" could exceed 100% and mislead. Against
 * people, every step is an honest "% of everyone who tapped".
 */
export function conversions(f: Funnel) {
  return {
    tapToPass: pct(f.passesAdded, f.people),
    tapToClick: pct(f.clickers, f.people),
    tapToRedemption: pct(f.redemptions, f.people),
  };
}

const funnelSelect = {
  taps: sql<number>`count(*) filter (where type = 'tap')::int`,
  people: sql<number>`count(distinct card_id) filter (where type = 'tap')::int`,
  passesAdded: sql<number>`count(*) filter (where type = 'pass_added')::int`,
  clicks: sql<number>`count(*) filter (where type = 'click')::int`,
  clickers: sql<number>`count(distinct pass_serial) filter (where type = 'click')::int`,
  redemptions: sql<number>`count(*) filter (where type = 'redemption')::int`,
};

const EMPTY_FUNNEL: Funnel = { taps: 0, people: 0, passesAdded: 0, clicks: 0, clickers: 0, redemptions: 0 };

export async function campaignFunnel(campaignId: string, since?: Date): Promise<Funnel> {
  const where = since
    ? and(eq(walletEvents.campaignId, campaignId), gte(walletEvents.createdAt, since))
    : eq(walletEvents.campaignId, campaignId);
  const [row] = await db.select(funnelSelect).from(walletEvents).where(where);
  return row;
}

/** Cross-campaign list with headline numbers (§6 cross-campaign). */
export async function campaignHeadlines() {
  const campaigns = await db.select().from(walletCampaigns).orderBy(desc(walletCampaigns.createdAt));
  const stats = await db
    .select({ campaignId: walletEvents.campaignId, ...funnelSelect })
    .from(walletEvents)
    .groupBy(walletEvents.campaignId);
  const cards = await db
    .select({ campaignId: walletCards.campaignId, count: sql<number>`count(*)::int` })
    .from(walletCards)
    .groupBy(walletCards.campaignId);

  const byId = new Map(stats.map((s) => [s.campaignId, s]));
  const cardsById = new Map(cards.map((c) => [c.campaignId, c.count]));
  return campaigns.map((c) => {
    const f: Funnel = byId.get(c.id) ?? EMPTY_FUNNEL;
    return { campaign: c, funnel: f, conv: conversions(f), cards: cardsById.get(c.id) ?? 0 };
  });
}

export async function deviceSplit(campaignId: string) {
  return db
    .select({ device: walletEvents.deviceType, count: sql<number>`count(*)::int` })
    .from(walletEvents)
    .where(and(eq(walletEvents.campaignId, campaignId), eq(walletEvents.type, "tap")))
    .groupBy(walletEvents.deviceType);
}

export async function clicksByAction(campaignId: string) {
  return db
    .select({ action: walletEvents.action, count: sql<number>`count(*)::int` })
    .from(walletEvents)
    .where(and(eq(walletEvents.campaignId, campaignId), eq(walletEvents.type, "click")))
    .groupBy(walletEvents.action)
    .orderBy(desc(sql`count(*)`));
}

export async function redemptionsByStore(campaignId: string, since?: Date) {
  const where = since
    ? and(eq(walletEvents.campaignId, campaignId), eq(walletEvents.type, "redemption"), gte(walletEvents.createdAt, since))
    : and(eq(walletEvents.campaignId, campaignId), eq(walletEvents.type, "redemption"));
  return db
    .select({
      store: sql<string>`coalesce(store_name, '(unknown)')`,
      count: sql<number>`count(*)::int`,
      amount: sql<number>`coalesce(sum(amount), 0)::float`,
    })
    .from(walletEvents)
    .where(where)
    .groupBy(sql`coalesce(store_name, '(unknown)')`)
    .orderBy(desc(sql`count(*)`));
}

export async function redemptionsByMethod(campaignId: string) {
  return db
    .select({ method: walletEvents.method, count: sql<number>`count(*)::int` })
    .from(walletEvents)
    .where(and(eq(walletEvents.campaignId, campaignId), eq(walletEvents.type, "redemption")))
    .groupBy(walletEvents.method);
}

/** Redemptions by hour of day (0–23) and day of week (0=Sun…6=Sat), in UTC. */
export async function redemptionsByHour(campaignId: string) {
  return db
    .select({ hour: sql<number>`extract(hour from created_at)::int`, count: sql<number>`count(*)::int` })
    .from(walletEvents)
    .where(and(eq(walletEvents.campaignId, campaignId), eq(walletEvents.type, "redemption")))
    .groupBy(sql`extract(hour from created_at)`)
    .orderBy(sql`extract(hour from created_at)`);
}

export async function redemptionsByDow(campaignId: string) {
  return db
    .select({ dow: sql<number>`extract(dow from created_at)::int`, count: sql<number>`count(*)::int` })
    .from(walletEvents)
    .where(and(eq(walletEvents.campaignId, campaignId), eq(walletEvents.type, "redemption")))
    .groupBy(sql`extract(dow from created_at)`)
    .orderBy(sql`extract(dow from created_at)`);
}

/** Passes still installed vs removed (§6) — from pass state, not events. */
export async function passInstallState(campaignId: string) {
  const [row] = await db
    .select({
      created: sql<number>`count(*) filter (where status = 'created')::int`,
      installed: sql<number>`count(*) filter (where status = 'added')::int`,
      removed: sql<number>`count(*) filter (where status = 'removed')::int`,
      redeemed: sql<number>`count(*) filter (where redeemed_at is not null)::int`,
    })
    .from(passes)
    .where(eq(passes.campaignId, campaignId));
  return row;
}

/**
 * Taps per hour (§6 time-series, "so I can see the booth's peak"). Buckets by the hour
 * in UTC over the campaign's whole tap history; the chart picks the window to show.
 */
export async function tapsByHour(campaignId: string) {
  return db
    .select({
      bucket: sql<string>`date_trunc('hour', created_at)`,
      count: sql<number>`count(*)::int`,
    })
    .from(walletEvents)
    .where(and(eq(walletEvents.campaignId, campaignId), eq(walletEvents.type, "tap")))
    .groupBy(sql`date_trunc('hour', created_at)`)
    .orderBy(sql`date_trunc('hour', created_at)`);
}

export async function recentEvents(campaignId: string, limit = 200) {
  return db
    .select()
    .from(walletEvents)
    .where(eq(walletEvents.campaignId, campaignId))
    .orderBy(desc(walletEvents.createdAt))
    .limit(limit);
}
