import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { smsPrograms } from "@/lib/db/schema";
import { getCurrentAdmin } from "@/lib/auth/session";
import { smsProgramSchema } from "@/lib/validation";

export const runtime = "nodejs";

/** Create a text-to-enter giveaway. Keywords are unique across all giveaways. */
export async function POST(req: NextRequest) {
  if (!(await getCurrentAdmin())) return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  const parsed = smsProgramSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    const i = parsed.error.issues[0];
    return NextResponse.json({ ok: false, error: i ? `${i.path.join(".")}: ${i.message}` : "invalid" }, { status: 422 });
  }
  const [row] = await db.insert(smsPrograms).values(parsed.data).onConflictDoNothing().returning({ id: smsPrograms.id });
  if (!row) return NextResponse.json({ ok: false, error: `keyword ${parsed.data.keyword} is already used by another giveaway` }, { status: 409 });
  return NextResponse.json({ ok: true, id: row.id });
}
