import { and, desc, eq, gte, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import { offerClaims, smsEntries, smsMessages, smsOptOuts, smsPrograms, type SmsProgram } from "@/lib/db/schema";
import { MAX_REPLIES_PER_PHONE_PER_DAY, programSteps } from "@/lib/sms-inbound";

/**
 * Outbound texts — only ever the first text of a conversation, to someone who ticked the
 * opt-in box on a campaign's page. Everything after that is a reply to them (TwiML).
 *
 * Guards, all required: the program's live switch is on (off until the number is
 * verified), it's daytime across the US, they haven't texted STOP, they're under the
 * per-number daily cap, and this person's first text hasn't already gone out.
 */

/** 9am–5pm Pacific = noon–8pm Eastern: daytime in every mainland US time zone. */
export function inSendWindow(now = new Date()): boolean {
  const hour = Number(new Intl.DateTimeFormat("en-US", { timeZone: "America/Los_Angeles", hour: "numeric", hourCycle: "h23" }).format(now));
  return hour >= 9 && hour < 17;
}

export const twilioSendingConfigured = () =>
  Boolean(process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN && process.env.TWILIO_PHONE_NUMBER);

/** Send one text through Twilio's API. Returns the message SID, or the error. */
export async function sendSms(to: string, body: string): Promise<{ sid: string } | { error: string }> {
  const sidAccount = process.env.TWILIO_ACCOUNT_SID!;
  const token = process.env.TWILIO_AUTH_TOKEN!;
  const res = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${sidAccount}/Messages.json`, {
    method: "POST",
    headers: {
      Authorization: `Basic ${Buffer.from(`${sidAccount}:${token}`).toString("base64")}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({ To: to, From: process.env.TWILIO_PHONE_NUMBER!, Body: body }),
  });
  const json = (await res.json().catch(() => ({}))) as { sid?: string; message?: string; code?: number };
  if (!res.ok || !json.sid) return { error: json.message ? `${json.message}${json.code ? ` (${json.code})` : ""}` : `HTTP ${res.status}` };
  return { sid: json.sid };
}

export type StartResult = "sent" | "not_live" | "outside_hours" | "opted_out" | "already_started" | "capped" | "not_configured" | "no_conversation" | `failed: ${string}`;

/** Send the first text to one web sign-up, if every guard passes. */
export async function startConversation(program: SmsProgram, phone: string): Promise<StartResult> {
  const steps = programSteps(program);
  if (!steps) return "no_conversation";
  if (!program.liveSending || !program.open) return "not_live";
  if (!twilioSendingConfigured()) return "not_configured";
  if (!inSendWindow()) return "outside_hours";
  const [stopped] = await db.select().from(smsOptOuts).where(eq(smsOptOuts.phone, phone)).limit(1);
  if (stopped) return "opted_out";
  const [{ n }] = await db
    .select({ n: sql<number>`count(*)::int` })
    .from(smsMessages)
    .where(and(eq(smsMessages.direction, "out"), eq(smsMessages.phone, phone), gte(smsMessages.createdAt, new Date(Date.now() - 86400_000))));
  if (n >= MAX_REPLIES_PER_PHONE_PER_DAY) return "capped";

  // Claim the send first (step 0 → 1), so two triggers can never text someone twice.
  const claimed = await db
    .update(smsEntries)
    .set({ step: 1 })
    .where(and(eq(smsEntries.programId, program.id), eq(smsEntries.phone, phone), eq(smsEntries.step, 0)))
    .returning({ id: smsEntries.id });
  if (!claimed.length) return "already_started";

  const result = await sendSms(phone, steps[0]);
  if ("error" in result) {
    await db.update(smsEntries).set({ step: 0 }).where(eq(smsEntries.id, claimed[0].id)); // try again later
    return `failed: ${result.error}`;
  }
  await db.insert(smsMessages).values({ direction: "out", phone, body: steps[0], programId: program.id, kind: "step_1", twilioSid: result.sid });
  return "sent";
}

/** The open texting program linked to a wallet campaign, if any. */
export async function programForCampaign(campaignId: string): Promise<SmsProgram | null> {
  const [p] = await db
    .select()
    .from(smsPrograms)
    .where(and(eq(smsPrograms.walletCampaignId, campaignId), eq(smsPrograms.open, true)))
    .orderBy(desc(smsPrograms.createdAt))
    .limit(1);
  return p ?? null;
}

/**
 * Someone ticked the opt-in box on a campaign's page: add them to that campaign's
 * conversation (never another campaign's) and, if it's live and daytime, text them now.
 * Otherwise they wait at step 0 for "Send to everyone waiting".
 */
export async function enrollWebOptIn(campaignId: string, phone: string, passSerial: string | null, cardId: string | null): Promise<StartResult | "no_program"> {
  const program = await programForCampaign(campaignId);
  if (!program) return "no_program";
  await db
    .insert(smsEntries)
    .values({ programId: program.id, phone, passSerial, cardId, step: 0, source: "web" })
    .onConflictDoNothing();
  return startConversation(program, phone);
}

/**
 * "Send to everyone waiting": everyone who opted in on this program's campaign page and
 * hasn't had their first text — including sign-ups from before the number was live.
 * Sends up to `limit` per click, one at a time, stopping at the first sign the window or
 * live switch closed.
 */
export async function sendToWaiting(program: SmsProgram, limit = 150) {
  if (program.walletCampaignId) {
    // Back-fill anyone who opted in on the page before this program existed.
    const optIns = await db
      .select({ phone: offerClaims.phone, passSerial: offerClaims.passSerial, cardId: offerClaims.cardId })
      .from(offerClaims)
      .where(and(eq(offerClaims.campaignId, program.walletCampaignId), eq(offerClaims.smsOptIn, true)));
    for (const o of optIns) {
      if (!o.phone) continue;
      await db.insert(smsEntries).values({ programId: program.id, phone: o.phone, passSerial: o.passSerial, cardId: o.cardId, step: 0, source: "web" }).onConflictDoNothing();
    }
  }
  const waiting = await db
    .select({ phone: smsEntries.phone })
    .from(smsEntries)
    .where(and(eq(smsEntries.programId, program.id), eq(smsEntries.step, 0)))
    .limit(limit);

  const tally: Record<string, number> = {};
  for (const w of waiting) {
    const r = await startConversation(program, w.phone);
    const key = r.startsWith("failed") ? "failed" : r;
    tally[key] = (tally[key] ?? 0) + 1;
    if (r === "not_live" || r === "outside_hours" || r === "not_configured") break;
  }
  return { waiting: waiting.length, ...tally };
}
