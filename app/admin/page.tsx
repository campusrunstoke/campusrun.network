import { desc, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import { submissions } from "@/lib/db/schema";

// Gated by middleware (Basic auth). Node runtime + always fresh.
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const LIMIT = 1000;

function fmt(d: Date) {
  return d.toISOString().replace("T", " ").slice(0, 19) + "Z";
}

export default async function AdminPage() {
  const [rows, [{ total }]] = await Promise.all([
    db.select().from(submissions).orderBy(desc(submissions.createdAt)).limit(LIMIT),
    db.select({ total: sql<number>`count(*)::int` }).from(submissions),
  ]);

  return (
    <main className="mx-auto w-full max-w-6xl px-6 py-8">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-bold text-ink">Submissions</h1>
          <p className="text-sm text-muted">
            {total} total{total > LIMIT ? ` · showing newest ${LIMIT}` : ""}
          </p>
        </div>
        <a
          href="/api/export"
          className="rounded-xl border-2 border-line bg-fill px-4 py-2 text-sm font-semibold text-ink hover:border-ink"
        >
          Download CSV
        </a>
      </div>

      <div className="overflow-x-auto rounded-2xl border border-line">
        <table className="w-full border-collapse text-sm">
          <thead className="bg-fill text-left text-muted">
            <tr>
              <Th>Timestamp (UTC)</Th>
              <Th>Rating</Th>
              <Th>Email</Th>
              <Th>Event (e)</Th>
              <Th>Brand (b)</Th>
              <Th>Card (c)</Th>
              <Th>User agent</Th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 && (
              <tr>
                <td colSpan={7} className="px-3 py-8 text-center text-muted">
                  No submissions yet.
                </td>
              </tr>
            )}
            {rows.map((r) => (
              <tr key={r.id} className="border-t border-line align-top">
                <Td mono>{fmt(r.createdAt)}</Td>
                <Td>
                  <span className="font-semibold text-ink">{r.rating}</span>
                </Td>
                <Td>{r.email ?? <Empty />}</Td>
                <Td>{r.eventId ?? <Empty />}</Td>
                <Td>{r.brand ?? <Empty />}</Td>
                <Td>{r.cardNumber ?? <Empty />}</Td>
                <Td>
                  <span className="line-clamp-2 max-w-xs text-muted">
                    {r.userAgent ?? <Empty />}
                  </span>
                </Td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </main>
  );
}

function Th({ children }: { children: React.ReactNode }) {
  return <th className="whitespace-nowrap px-3 py-2 font-semibold">{children}</th>;
}
function Td({ children, mono }: { children: React.ReactNode; mono?: boolean }) {
  return (
    <td className={`px-3 py-2 text-ink ${mono ? "whitespace-nowrap font-mono text-xs" : ""}`}>
      {children}
    </td>
  );
}
function Empty() {
  return <span className="text-line">—</span>;
}
