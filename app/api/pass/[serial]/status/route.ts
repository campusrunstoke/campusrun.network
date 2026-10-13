import { NextRequest, NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { passes } from "@/lib/db/schema";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Has this pass reached a Wallet yet? Apple registers the pass with our server the
 * moment it's added, so the loading page polls this to switch to "Added — open Wallet".
 */
export async function GET(_req: NextRequest, ctx: { params: Promise<{ serial: string }> }) {
  const { serial } = await ctx.params;
  if (!/^[0-9a-f]{32}$/.test(serial)) return NextResponse.json({ added: false }, { status: 404 });
  const [p] = await db.select({ status: passes.status }).from(passes).where(eq(passes.serial, serial)).limit(1);
  return NextResponse.json({ added: p?.status === "added" }, { headers: { "Cache-Control": "no-store" } });
}
