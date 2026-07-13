import { and, desc, eq, type SQL } from "drizzle-orm";
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { submissions } from "@/lib/db/schema";
import { submissionsToCsv } from "@/lib/csv";
import { getCurrentAdmin } from "@/lib/auth/session";

// Node runtime for postgres.js. Gated by the admin session.
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// GET /api/export?e=&b=&c=  — any/all optional. No filters = every submission.
export async function GET(req: NextRequest) {
  if (!(await getCurrentAdmin())) {
    return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  }

  const sp = req.nextUrl.searchParams;
  const e = sp.get("e")?.trim() || null; // drop / event
  const b = sp.get("b")?.trim() || null; // brand
  const c = sp.get("c")?.trim() || null; // card

  const conditions: SQL[] = [];
  if (e) conditions.push(eq(submissions.eventId, e));
  if (b) conditions.push(eq(submissions.brand, b));
  if (c) conditions.push(eq(submissions.cardNumber, c));

  const rows = await db
    .select()
    .from(submissions)
    .where(conditions.length ? and(...conditions) : undefined)
    .orderBy(desc(submissions.createdAt));

  const label = [b, e, c && `card-${c}`].filter(Boolean).join("-");
  const filename = label ? `campusrun-${label}.csv` : "campusrun-submissions.csv";

  return new Response(submissionsToCsv(rows), {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "no-store",
    },
  });
}
