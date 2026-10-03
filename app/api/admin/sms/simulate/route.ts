import { NextRequest, NextResponse } from "next/server";
import { inArray, like } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/lib/db";
import { smsEntries, smsMessages, smsOptOuts } from "@/lib/db/schema";
import { getCurrentAdmin } from "@/lib/auth/session";
import { handleInbound } from "@/lib/sms-inbound";

export const runtime = "nodejs";

// (310) 555-01XX numbers are reserved for fiction — no real phone has one, so simulated
// texts can never collide with a real entrant and are easy to clear.
const TEST_PREFIX = "+131055501"; // + two digits → +1 310 555 01NN
const schema = z.object({ tester: z.number().int().min(0).max(99), body: z.string().max(1000) });

/** Run a pretend text through the exact production logic; returns what we'd reply. */
export async function POST(req: NextRequest) {
  if (!(await getCurrentAdmin())) return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ ok: false, error: "invalid" }, { status: 422 });
  const phone = `${TEST_PREFIX}${String(parsed.data.tester).padStart(2, "0")}`;
  const result = await handleInbound(phone, parsed.data.body, null);
  return NextResponse.json({ ok: true, phone, ...result });
}

/** Remove everything the simulator created. */
export async function DELETE() {
  if (!(await getCurrentAdmin())) return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  const testPhones = like(smsEntries.phone, `${TEST_PREFIX}%`);
  const entries = await db.delete(smsEntries).where(testPhones).returning({ id: smsEntries.id });
  await db.delete(smsMessages).where(like(smsMessages.phone, `${TEST_PREFIX}%`));
  const opts = await db.select().from(smsOptOuts).where(like(smsOptOuts.phone, `${TEST_PREFIX}%`));
  if (opts.length) await db.delete(smsOptOuts).where(inArray(smsOptOuts.phone, opts.map((o) => o.phone)));
  return NextResponse.json({ ok: true, removed: entries.length });
}
