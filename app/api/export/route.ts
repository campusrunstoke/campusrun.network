import { desc } from "drizzle-orm";
import { db } from "@/lib/db";
import { submissions } from "@/lib/db/schema";
import { submissionsToCsv } from "@/lib/csv";

// Gated by middleware (Basic auth). Node runtime for postgres.js.
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
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
