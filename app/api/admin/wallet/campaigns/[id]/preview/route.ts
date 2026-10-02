import { NextRequest, NextResponse } from "next/server";
import QRCode from "qrcode";
import { getCurrentAdmin } from "@/lib/auth/session";
import { signPreviewToken } from "@/lib/wallet/ids";
import { walletConfigured } from "@/lib/wallet/config";
import { siteUrl } from "@/lib/campaigns";

export const runtime = "nodejs";

/** Mint a 2-hour preview link (+ QR) for the designer's "test on my phone". */
export async function POST(_req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  if (!(await getCurrentAdmin())) return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  const { id } = await ctx.params;

  const token = signPreviewToken(id);
  if (!token || !walletConfigured) {
    return NextResponse.json(
      { ok: false, error: "Apple Wallet signing isn't configured on this server, so it can't build a test pass." },
      { status: 503 },
    );
  }
  const url = `${siteUrl()}/p/${token}`;
  const qr = await QRCode.toDataURL(url, { margin: 1, width: 480, color: { dark: "#003B5C", light: "#FFFFFF" } });
  return NextResponse.json({ ok: true, url, qr });
}
