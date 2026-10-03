import { createHmac, timingSafeEqual } from "node:crypto";
import { and, desc, eq, gte, isNull, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import { smsEntries, smsMessages, smsOptOuts, smsPrograms, type SmsProgram } from "@/lib/db/schema";
import { HELP_WORDS, START_WORDS, STOP_WORDS } from "@/lib/sms";

/**
 * Twilio signs every webhook: base64(HMAC-SHA1(authToken, url + sorted key/value
 * pairs)). Checking it is what stops anyone from POSTing fake entries at our endpoint.
 */
export function validTwilioSignature(authToken: string, url: string, params: Record<string, string>, signature: string) {
  const data = url + Object.keys(params).sort().map((k) => k + params[k]).join("");
  const expected = createHmac("sha1", authToken).update(data, "utf8").digest("base64");
  const a = Buffer.from(expected);
  const b = Buffer.from(signature);
  return a.length === b.length && timingSafeEqual(a, b);
}

// Spend guards. A text costs about a cent, so these bound the worst case even if a
// number is flooded: replies stop, but entries and answers are still recorded.
export const MAX_REPLIES_PER_PHONE_PER_DAY = 4;
export const MAX_REPLIES_PER_HOUR = 600;
const ANSWER_WINDOW_DAYS = 14; // a text this long after entering isn't an answer
const MAX_BODY = 1000;

export type InboundResult = { reply: string | null; kind: string; programId: string | null };

/** "Pocari!" / " pocari " / "POCARI please" → "POCARI". */
const firstWord = (body: string) => body.trim().split(/\s+/)[0]?.replace(/[^A-Za-z0-9-]/g, "").toUpperCase() ?? "";
const wholeWord = (body: string) => body.trim().replace(/[.!]+$/, "").toUpperCase();

/**
 * Decide what one incoming text means and what (if anything) we send back. Every text
 * in and out is logged. Rules, in order:
 *  1. STOP words → opt out, no reply (Twilio confirms the opt-out itself).
 *  2. Opted-out numbers get nothing — except START/UNSTOP/YES, which opt back in.
 *  3. HELP → that giveaway's help text.
 *  4. The keyword of an open giveaway → the entry (once per number) + the question.
 *     Texting it again does nothing. A closed giveaway's keyword → "it has ended", once.
 *  5. Anything else from someone with an unanswered entry → their answer, + thanks.
 *     (So "Yes" answers the question; it's only an opt-in word after a STOP.)
 *  6. Anything else from a stranger → "Text KEYWORD to enter", once a day.
 */
export async function handleInbound(phone: string, rawBody: string, sid: string | null): Promise<InboundResult> {
  const body = rawBody.slice(0, MAX_BODY);
  const word = wholeWord(body);

  await db.insert(smsMessages).values({ direction: "in", phone, body, twilioSid: sid });

  if (STOP_WORDS.includes(word)) {
    await db.insert(smsOptOuts).values({ phone }).onConflictDoNothing();
    return { reply: null, kind: "opt_out", programId: null };
  }

  const [optedOut] = await db.select().from(smsOptOuts).where(eq(smsOptOuts.phone, phone)).limit(1);
  if (optedOut) {
    if (START_WORDS.includes(word)) await db.delete(smsOptOuts).where(eq(smsOptOuts.phone, phone));
    return { reply: null, kind: optedOut && START_WORDS.includes(word) ? "opt_in" : "ignored_opted_out", programId: null };
  }

  const programs = await db.select().from(smsPrograms).orderBy(desc(smsPrograms.createdAt));
  const byKeyword = new Map(programs.map((p) => [p.keyword, p]));
  const latestOpen = programs.find((p) => p.open) ?? null;

  // This number's most recent entry, which decides HELP wording and whether a text is an answer.
  const [lastEntry] = await db
    .select()
    .from(smsEntries)
    .where(eq(smsEntries.phone, phone))
    .orderBy(desc(smsEntries.enteredAt))
    .limit(1);
  const lastProgram = lastEntry ? programs.find((p) => p.id === lastEntry.programId) ?? null : null;

  if (HELP_WORDS.includes(word)) {
    const p = lastProgram ?? latestOpen;
    return send(phone, p, p?.replyHelp ?? null, "help");
  }

  const program = byKeyword.get(firstWord(body));
  if (program) {
    if (!program.open) {
      const already = await sentBefore(phone, program.id, "closed");
      return send(phone, program, already ? null : program.replyClosed, "closed");
    }
    // The unique (program, phone) index makes this the one-entry-per-person rule, race-proof.
    const inserted = await db
      .insert(smsEntries)
      .values({ programId: program.id, phone })
      .onConflictDoNothing()
      .returning({ id: smsEntries.id });
    if (inserted.length === 0) return { reply: null, kind: "duplicate_entry", programId: program.id };
    return send(phone, program, program.replyEntry, "entry");
  }

  const since = new Date(Date.now() - ANSWER_WINDOW_DAYS * 86400_000);
  if (lastEntry && lastProgram && !lastEntry.answer && lastEntry.enteredAt >= since) {
    const updated = await db
      .update(smsEntries)
      .set({ answer: body.trim().slice(0, 500), answeredAt: new Date() })
      .where(and(eq(smsEntries.id, lastEntry.id), isNull(smsEntries.answer)))
      .returning({ id: smsEntries.id });
    if (updated.length === 0) return { reply: null, kind: "ignored", programId: lastProgram.id };
    return send(phone, lastProgram, lastProgram.replyAnswer, "answer");
  }

  if (lastEntry) return { reply: null, kind: "ignored", programId: lastProgram?.id ?? null };

  if (!latestOpen) return { reply: null, kind: "ignored", programId: null };
  const recent = await sentBefore(phone, null, "wrong_keyword", new Date(Date.now() - 86400_000));
  return send(phone, latestOpen, recent ? null : latestOpen.replyWrongKeyword, "wrong_keyword");
}

async function sentBefore(phone: string, programId: string | null, kind: string, since?: Date) {
  const [row] = await db
    .select({ n: sql<number>`count(*)::int` })
    .from(smsMessages)
    .where(
      and(
        eq(smsMessages.direction, "out"),
        eq(smsMessages.phone, phone),
        eq(smsMessages.kind, kind),
        programId ? eq(smsMessages.programId, programId) : undefined,
        since ? gte(smsMessages.createdAt, since) : undefined,
      ),
    );
  return row.n > 0;
}

/** Apply the spend guards, log the reply, and hand it back for the TwiML response. */
async function send(phone: string, program: SmsProgram | null, text: string | null, kind: string): Promise<InboundResult> {
  const programId = program?.id ?? null;
  if (!text?.trim()) return { reply: null, kind, programId };

  const dayAgo = new Date(Date.now() - 86400_000);
  const hourAgo = new Date(Date.now() - 3600_000);
  const [[perPhone], [perHour]] = await Promise.all([
    db
      .select({ n: sql<number>`count(*)::int` })
      .from(smsMessages)
      .where(and(eq(smsMessages.direction, "out"), eq(smsMessages.phone, phone), gte(smsMessages.createdAt, dayAgo))),
    db
      .select({ n: sql<number>`count(*)::int` })
      .from(smsMessages)
      .where(and(eq(smsMessages.direction, "out"), gte(smsMessages.createdAt, hourAgo))),
  ]);
  if (perPhone.n >= MAX_REPLIES_PER_PHONE_PER_DAY || perHour.n >= MAX_REPLIES_PER_HOUR) {
    return { reply: null, kind: `${kind}_throttled`, programId };
  }

  await db.insert(smsMessages).values({ direction: "out", phone, body: text, programId, kind });
  return { reply: text, kind, programId };
}

/** TwiML: Twilio sends whatever <Message> we return as the reply. Empty = no reply. */
export function twiml(reply: string | null) {
  const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  return `<?xml version="1.0" encoding="UTF-8"?><Response>${reply ? `<Message>${esc(reply)}</Message>` : ""}</Response>`;
}
