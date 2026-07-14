import { NextRequest, NextResponse } from "next/server";
import { and, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { campaigns, taps } from "@/lib/db/schema";
import { siteUrl } from "@/lib/campaigns";

// A tapped NFC card for a redirect campaign hits /go?e=&b=&c=.
// We log the tap, then 307-bounce to the client's site. Node runtime for the DB.
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const sp = req.nextUrl.searchParams;
  const e = sp.get("e")?.trim() || null;
  const b = sp.get("b")?.trim() || null;
  const c = sp.get("c")?.trim() || null;

  let destination = siteUrl(); // fallback if nothing matches
  let campaignId: string | null = null;

  if (b && e) {
    const [camp] = await db
      .select()
      .from(campaigns)
      .where(and(eq(campaigns.brand, b), eq(campaigns.eventId, e)))
      .limit(1);
    if (camp?.type === "redirect" && camp.destinationUrl) {
      destination = camp.destinationUrl;
      campaignId = camp.id;
    }
  }

  // Count the tap. Never let a logging hiccup block the redirect.
  try {
    await db.insert(taps).values({
      campaignId,
      eventId: e,
      brand: b,
      cardNumber: c,
      userAgent: req.headers.get("user-agent")?.slice(0, 512) ?? null,
    });
  } catch {
    /* swallow — the person still gets sent to the destination */
  }

  // 307 + no-store so every tap re-hits us and gets counted (not cached).
  return NextResponse.redirect(destination, {
    status: 307,
    headers: { "Cache-Control": "no-store" },
  });
}
