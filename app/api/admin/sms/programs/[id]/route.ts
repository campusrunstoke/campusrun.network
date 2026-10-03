import { NextRequest, NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { smsPrograms } from "@/lib/db/schema";
import { getCurrentAdmin } from "@/lib/auth/session";
import { smsProgramPatchSchema } from "@/lib/validation";

export const runtime = "nodejs";

/** Edit a giveaway's wording / settings, or open and close entries. */
export async function PATCH(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  if (!(await getCurrentAdmin())) return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  const { id } = await ctx.params;
  const parsed = smsProgramPatchSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    const i = parsed.error.issues[0];
    return NextResponse.json({ ok: false, error: i ? `${i.path.join(".")}: ${i.message}` : "invalid" }, { status: 422 });
  }
  try {
    const [row] = await db.update(smsPrograms).set(parsed.data).where(eq(smsPrograms.id, id)).returning({ id: smsPrograms.id });
    if (!row) return NextResponse.json({ ok: false, error: "not found" }, { status: 404 });
  } catch {
    return NextResponse.json({ ok: false, error: "that keyword is already used by another giveaway" }, { status: 409 });
  }
  return NextResponse.json({ ok: true });
}
