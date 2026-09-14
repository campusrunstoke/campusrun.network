import { NextRequest, NextResponse } from "next/server";
import { and, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { passRegistrations, passes } from "@/lib/db/schema";
import { authenticatePass } from "@/lib/wallet/apple-auth";
import { logEvent } from "@/lib/wallet/events";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Params = Promise<{ deviceLibraryId: string; passTypeId: string; serialNumber: string }>;

/**
 * Register a device for a pass (Apple PassKit web service).
 * POST /v1/devices/{deviceLibraryId}/registrations/{passTypeId}/{serialNumber}
 *
 * This is the pass_added signal — iOS calls it the moment the pass is added to Wallet.
 * 201 when newly registered, 200 if already registered (idempotent), 401 on bad token.
 */
export async function POST(req: NextRequest, ctx: { params: Params }) {
  const { deviceLibraryId, serialNumber } = await ctx.params;

  const pass = await authenticatePass(req.headers.get("authorization"), serialNumber);
  if (!pass) return new NextResponse(null, { status: 401 });

  let pushToken = "";
  try {
    pushToken = ((await req.json()) as { pushToken?: string }).pushToken ?? "";
  } catch {
    /* body optional in edge cases */
  }

  const [existing] = await db
    .select({ id: passRegistrations.id })
    .from(passRegistrations)
    .where(
      and(
        eq(passRegistrations.deviceLibraryId, deviceLibraryId),
        eq(passRegistrations.passSerial, serialNumber),
      ),
    )
    .limit(1);

  if (existing) return new NextResponse(null, { status: 200 });

  await db.insert(passRegistrations).values({ deviceLibraryId, passSerial: serialNumber, pushToken });

  // First time this pass is registered anywhere → it was added to a Wallet. Log pass_added once.
  if (pass.status === "created") {
    await db
      .update(passes)
      .set({ status: "added", addedAt: new Date() })
      .where(eq(passes.serial, serialNumber));
    await logEvent({
      type: "pass_added",
      campaignId: pass.campaignId,
      cardId: pass.cardId,
      passSerial: serialNumber,
      deviceType: "ios",
      deviceLibraryId,
    });
  }

  return new NextResponse(null, { status: 201 });
}

/**
 * Unregister a device (pass removed from Wallet).
 * DELETE /v1/devices/{deviceLibraryId}/registrations/{passTypeId}/{serialNumber}
 */
export async function DELETE(req: NextRequest, ctx: { params: Params }) {
  const { deviceLibraryId, serialNumber } = await ctx.params;

  const pass = await authenticatePass(req.headers.get("authorization"), serialNumber);
  if (!pass) return new NextResponse(null, { status: 401 });

  await db
    .delete(passRegistrations)
    .where(
      and(
        eq(passRegistrations.deviceLibraryId, deviceLibraryId),
        eq(passRegistrations.passSerial, serialNumber),
      ),
    );

  // No devices left holding this pass → treat as removed. Log pass_removed once.
  const remaining = await db
    .select({ id: passRegistrations.id })
    .from(passRegistrations)
    .where(eq(passRegistrations.passSerial, serialNumber))
    .limit(1);

  if (remaining.length === 0 && pass.status !== "removed") {
    await db
      .update(passes)
      .set({ status: "removed", removedAt: new Date() })
      .where(eq(passes.serial, serialNumber));
    await logEvent({
      type: "pass_removed",
      campaignId: pass.campaignId,
      cardId: pass.cardId,
      passSerial: serialNumber,
      deviceType: "ios",
      deviceLibraryId,
    });
  }

  return new NextResponse(null, { status: 200 });
}
