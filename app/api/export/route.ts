import { desc } from "drizzle-orm";
import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { submissions } from "@/lib/db/schema";
import { submissionsToCsv } from "@/lib/csv";
import { getCurrentAdmin } from "@/lib/auth/session";

// Node runtime for postgres.js. Gated by the admin session.
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  if (!(await getCurrentAdmin())) {
    return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  }

  const rows = await db
    .select()
    .from(submissions)
    .orderBy(desc(submissions.createdAt));

  return new Response(submissionsToCsv(rows), {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": 'attachment; filename="campusrun-submissions.csv"',
      "Cache-Control": "no-store",
    },
  });
}
