import { NextRequest, NextResponse } from "next/server";
import { desc } from "drizzle-orm";
import { db } from "@/lib/db";
import { campaigns } from "@/lib/db/schema";
import { campaignSchema } from "@/lib/validation";
import { getCurrentAdmin } from "@/lib/auth/session";

export const runtime = "nodejs";

export async function GET() {
  if (!(await getCurrentAdmin())) {
    return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  }
  const rows = await db.select().from(campaigns).orderBy(desc(campaigns.createdAt));
  return NextResponse.json({ ok: true, campaigns: rows });
}

export async function POST(req: NextRequest) {
  const admin = await getCurrentAdmin();
  if (!admin) {
    return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  }

  const parsed = campaignSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json(
      { ok: false, error: parsed.error.issues[0]?.message ?? "invalid" },
      { status: 422 },
    );
  }
  const { name, type, destinationUrl, b, e, c } = parsed.data;

  try {
    const [created] = await db
      .insert(campaigns)
      .values({
        name,
        type,
        destinationUrl: type === "redirect" ? destinationUrl : null,
        brand: b,
        eventId: e,
        cardNumber: c,
        createdBy: admin.id,
      })
      .returning();
    return NextResponse.json({ ok: true, campaign: created }, { status: 201 });
  } catch (err: unknown) {
    // unique (brand, event_id) violation — Drizzle nests the pg error under `cause`.
    const code =
      err && typeof err === "object"
        ? ((err as { code?: string }).code ?? (err as { cause?: { code?: string } }).cause?.code)
        : undefined;
    if (code === "23505") {
      return NextResponse.json(
        { ok: false, error: `A campaign for ${b}/${e} already exists.` },
        { status: 409 },
      );
    }
    throw err;
  }
}
