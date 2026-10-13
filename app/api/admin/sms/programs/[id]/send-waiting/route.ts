import { NextRequest, NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { smsPrograms } from "@/lib/db/schema";
import { getCurrentAdmin } from "@/lib/auth/session";
import { sendToWaiting } from "@/lib/sms-send";

export const runtime = "nodejs";
export const maxDuration = 60;

/** "Send to everyone waiting": first texts for web opt-ins who haven't had one yet. */
export async function POST(_req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  if (!(await getCurrentAdmin())) return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  const { id } = await ctx.params;
  const [program] = await db.select().from(smsPrograms).where(eq(smsPrograms.id, id)).limit(1);
  if (!program) return NextResponse.json({ ok: false, error: "not found" }, { status: 404 });
  const result = await sendToWaiting(program);
  return NextResponse.json({ ok: true, result });
}
