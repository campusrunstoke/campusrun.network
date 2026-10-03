import { NextRequest, NextResponse } from "next/server";
import { randomInt } from "node:crypto";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { smsEntries } from "@/lib/db/schema";
import { getCurrentAdmin } from "@/lib/auth/session";

export const runtime = "nodejs";

/**
 * Draw one entry uniformly at random (crypto RNG, every entry equal — answering the
 * question is a bonus, never a better chance). Not saved: draw, then contact the winner.
 */
export async function POST(_req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  if (!(await getCurrentAdmin())) return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  const { id } = await ctx.params;
  const entries = await db.select().from(smsEntries).where(eq(smsEntries.programId, id));
  if (entries.length === 0) return NextResponse.json({ ok: false, error: "no entries yet" }, { status: 404 });
  const w = entries[randomInt(entries.length)];
  return NextResponse.json({ ok: true, winner: { phone: w.phone, enteredAt: w.enteredAt, answer: w.answer }, of: entries.length });
}
