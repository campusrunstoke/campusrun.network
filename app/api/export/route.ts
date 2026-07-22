import { and, desc, eq, type SQL } from "drizzle-orm";
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { leads, submissions, taps } from "@/lib/db/schema";
import { leadsToCsv, submissionsToCsv, tapsToCsv } from "@/lib/csv";
import { getCurrentAdmin } from "@/lib/auth/session";

// Node runtime for postgres.js. Gated by the admin session.
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const LEAD_STATUSES = ["new", "contacted", "qualified", "closed"] as const;
type LeadStatus = (typeof LEAD_STATUSES)[number];

const csvResponse = (csv: string, filename: string) =>
  new Response(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "no-store",
    },
  });

// GET /api/export?type=ratings|taps|leads
//   ratings/taps → filter with &e=&b=&c=   ·   leads → filter with &status=
// No filters = everything.
export async function GET(req: NextRequest) {
  if (!(await getCurrentAdmin())) {
    return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  }

  const sp = req.nextUrl.searchParams;
  const type = sp.get("type");

  // Intake leads are their own shape (no e/b/c attribution) — handled separately.
  if (type === "leads") {
    const raw = sp.get("status")?.trim();
    const status = LEAD_STATUSES.includes(raw as LeadStatus) ? (raw as LeadStatus) : null;
    const rows = await db
      .select()
      .from(leads)
      .where(status ? eq(leads.status, status) : undefined)
      .orderBy(desc(leads.createdAt));
    return csvResponse(
      leadsToCsv(rows),
      status ? `campusrun-leads-${status}.csv` : "campusrun-leads.csv",
    );
  }

  const isTaps = type === "taps";
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

  return csvResponse(csv, filename);
}
