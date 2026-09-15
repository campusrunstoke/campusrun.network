import { NextRequest, NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { passes, walletStores } from "@/lib/db/schema";
import { redeemSchema } from "@/lib/validation";
import { rateLimit } from "@/lib/rate-limit";
import { verifyPassword } from "@/lib/auth/password";
import { logEvent } from "@/lib/wallet/events";
import { detectDevice } from "@/lib/wallet/ids";

export const runtime = "nodejs";

function clientIp(req: NextRequest): string {
  const xff = req.headers.get("x-forwarded-for");
  if (xff) return xff.split(",")[0].trim();
  return req.headers.get("x-real-ip") ?? "unknown";
}

/**
 * Record a coupon redemption (§5). Two methods:
 *   staff_scan — option A: a cashier scans the pass barcode (= serial) and confirms on
 *                our page. Store identity comes from the store picked; if that store
 *                has a staff PIN, it must match.
 *   receipt    — option B: the student self-reports store + amount (photo verification
 *                is a later enhancement; the event is captured now, flagged by method).
 *
 * Guards: one redemption per pass (409 on a repeat), per-IP rate limit, PIN check.
 */
export async function POST(req: NextRequest) {
  const ip = clientIp(req);
  const rl = rateLimit(`redeem:${ip}`, 30, 10 * 60 * 1000);
  if (!rl.ok) {
    return NextResponse.json({ ok: false, error: "rate_limited" }, { status: 429 });
  }

  const parsed = redeemSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ ok: false, error: "invalid" }, { status: 422 });
  }
  const { serial, method, storeId, storeName, amount, pin } = parsed.data;

  const [pass] = await db.select().from(passes).where(eq(passes.serial, serial)).limit(1);
  if (!pass) return NextResponse.json({ ok: false, error: "not_found" }, { status: 404 });
  if (pass.redeemedAt) {
    return NextResponse.json({ ok: false, error: "already_redeemed" }, { status: 409 });
  }

  let resolvedStoreId: string | null = null;
  let resolvedStoreName: string | null = storeName;

  if (method === "staff_scan") {
    if (!storeId) return NextResponse.json({ ok: false, error: "store_required" }, { status: 422 });
    const [store] = await db.select().from(walletStores).where(eq(walletStores.id, storeId)).limit(1);
    if (!store || !store.active || (store.campaignId && store.campaignId !== pass.campaignId)) {
      return NextResponse.json({ ok: false, error: "bad_store" }, { status: 422 });
    }
    // Staff PIN, if the store has one — stops a student self-redeeming at the register page.
    if (store.pinHash) {
      if (!pin || !(await verifyPassword(store.pinHash, pin))) {
        return NextResponse.json({ ok: false, error: "bad_pin" }, { status: 403 });
      }
    }
    resolvedStoreId = store.id;
    resolvedStoreName = store.name;
  } else if (!resolvedStoreName) {
    return NextResponse.json({ ok: false, error: "store_required" }, { status: 422 });
  }

  const now = new Date();
  await db.update(passes).set({ redeemedAt: now }).where(eq(passes.serial, serial));

  const userAgent = req.headers.get("user-agent");
  await logEvent({
    type: "redemption",
    campaignId: pass.campaignId,
    cardId: pass.cardId,
    passSerial: serial,
    storeId: resolvedStoreId,
    storeName: resolvedStoreName,
    method,
    amount: amount === null ? null : amount.toFixed(2),
    deviceType: detectDevice(userAgent),
    userAgent: userAgent?.slice(0, 512) ?? null,
  });

  return NextResponse.json({ ok: true, store: resolvedStoreName });
}
