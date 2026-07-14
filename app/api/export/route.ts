import { and, desc, eq, type SQL } from "drizzle-orm";
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { submissions, taps } from "@/lib/db/schema";
import { submissionsToCsv, tapsToCsv } from "@/lib/csv";
import { getCurrentAdmin } from "@/lib/auth/session";

// Node runtime for postgres.js. Gated by the admin session.
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// GET /api/export?type=ratings|taps&e=&b=&c=  — filters optional; no filters = everything.
export async function GET(req: NextRequest) {
  if (!(await getCurrentAdmin())) {
    return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  }

  const sp = req.nextUrl.searchParams;
  const isTaps = sp.get("type") === "taps";
  const e = sp.get("e")?.trim() || null;
  const b = sp.get("b")?.trim() || null;
  const c = sp.get("c")?.trim() || null;

  const table = isTaps ? taps : submissions;
  const conditions: SQL[] = [];
  if (e) conditions.push(eq(table.eventId, e));
  if (b) conditions.push(eq(table.brand, b));
  if (c) conditions.push(eq(table.cardNumber, c));
  const where = conditions.length ? and(...conditions) : undefined;

  let csv: string;
  if (isTaps) {
    const rows = await db.select().from(taps).where(where).orderBy(desc(taps.createdAt));
    csv = tapsToCsv(rows);
  } else {
    const rows = await db
      .select()
      .from(submissions)
      .where(where)
      .orderBy(desc(submissions.createdAt));
    csv = submissionsToCsv(rows);
  }

  const label = [isTaps ? "taps" : null, b, e, c && `card-${c}`].filter(Boolean).join("-");
  const filename = label ? `campusrun-${label}.csv` : "campusrun-submissions.csv";

  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "no-store",
    },
  });
}
