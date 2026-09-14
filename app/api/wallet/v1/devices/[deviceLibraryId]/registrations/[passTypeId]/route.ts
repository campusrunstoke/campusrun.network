import { NextRequest, NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { passRegistrations } from "@/lib/db/schema";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Params = Promise<{ deviceLibraryId: string; passTypeId: string }>;

/**
 * List serials of passes registered to a device that changed since a tag (Apple polls
 * this to know which passes to refresh).
 * GET /v1/devices/{deviceLibraryId}/registrations/{passTypeId}?passesUpdatedSince={tag}
 *
 * v1 never changes pass content, so there is nothing to refresh → 204 No Content. The
 * endpoint exists and is correct, so switching on push updates later needs no rewrite.
 */
export async function GET(req: NextRequest, ctx: { params: Params }) {
  const { deviceLibraryId } = await ctx.params;

  const regs = await db
    .select({ serial: passRegistrations.passSerial })
    .from(passRegistrations)
    .where(eq(passRegistrations.deviceLibraryId, deviceLibraryId));

  if (regs.length === 0) return new NextResponse(null, { status: 204 });

  // No pass has been updated yet in v1 → report nothing to refresh.
  return new NextResponse(null, { status: 204 });
}
