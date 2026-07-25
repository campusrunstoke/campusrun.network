import { NextResponse } from "next/server";
import { drizzle } from "drizzle-orm/postgres-js";
import { migrate } from "drizzle-orm/postgres-js/migrator";
import postgres from "postgres";
import path from "node:path";
import { getCurrentAdmin } from "@/lib/auth/session";

// TEMPORARY one-off ops endpoint — DELETE AFTER USE.
// Runs pending drizzle migrations (same as `npm run db:migrate`) from a
// deployed environment, for when no machine has direct DB access. Admin-gated.
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST() {
  const admin = await getCurrentAdmin();
  if (!admin) {
    return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  }

  const url = process.env.DATABASE_URL;
  if (!url) {
    return NextResponse.json({ ok: false, error: "DATABASE_URL not set" }, { status: 500 });
  }

  // Dedicated single connection, prepare:false for the Neon pooler —
  // mirrors lib/db/migrate.ts exactly.
  const client = postgres(url, { max: 1, prepare: false });
  try {
    const db = drizzle(client);
    await migrate(db, { migrationsFolder: path.join(process.cwd(), "drizzle") });

    // Proof of where we ran: list taps columns + confirm this DB holds the
    // production campaigns (daps/rotm26 was created via the live admin).
    const cols = await client`
      select column_name from information_schema.columns
      where table_name = 'taps' order by ordinal_position`;
    const [check] = await client`
      select
        (select count(*)::int from campaigns) as campaign_count,
        exists(select 1 from campaigns where brand = 'daps' and event_id = 'rotm26') as has_daps_rotm26`;
    const [migs] = await client`
      select count(*)::int as applied from drizzle.__drizzle_migrations`;

    return NextResponse.json({
      ok: true,
      tapsColumns: cols.map((c) => c.column_name),
      campaignCount: check?.campaign_count ?? null,
      hasDapsRotm26: check?.has_daps_rotm26 ?? null,
      migrationsApplied: migs?.applied ?? null,
    });
  } catch (err) {
    return NextResponse.json(
      { ok: false, error: err instanceof Error ? err.message : "migration failed" },
      { status: 500 },
    );
  } finally {
    await client.end();
  }
}

// Same payload without running anything — lets us inspect state first.
export async function GET() {
  const admin = await getCurrentAdmin();
  if (!admin) {
    return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  }
  const url = process.env.DATABASE_URL;
  if (!url) {
    return NextResponse.json({ ok: false, error: "DATABASE_URL not set" }, { status: 500 });
  }
  const client = postgres(url, { max: 1, prepare: false });
  try {
    const cols = await client`
      select column_name from information_schema.columns
      where table_name = 'taps' order by ordinal_position`;
    const [check] = await client`
      select
        (select count(*)::int from campaigns) as campaign_count,
        exists(select 1 from campaigns where brand = 'daps' and event_id = 'rotm26') as has_daps_rotm26`;
    return NextResponse.json({
      ok: true,
      tapsColumns: cols.map((c) => c.column_name),
      campaignCount: check?.campaign_count ?? null,
      hasDapsRotm26: check?.has_daps_rotm26 ?? null,
    });
  } finally {
    await client.end();
  }
}
