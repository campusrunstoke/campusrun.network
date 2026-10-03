import { NextRequest, NextResponse } from "next/server";
import { siteUrl } from "@/lib/campaigns";
import { handleInbound, twiml, validTwilioSignature } from "@/lib/sms-inbound";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Twilio's "A message comes in" webhook: POST https://www.campusrun.network/api/sms/inbound
 * Fails closed — with no auth token configured, or a bad signature, nothing is recorded.
 */
export async function POST(req: NextRequest) {
  const token = process.env.TWILIO_AUTH_TOKEN;
  if (!token) return new NextResponse("not configured", { status: 503 });

  const form = await req.formData();
  const params: Record<string, string> = {};
  for (const [k, v] of form.entries()) if (typeof v === "string") params[k] = v;

  // Twilio signs the exact URL configured on the number, so rebuild it from our canonical
  // site URL rather than trusting the Host header the request arrived with.
  const url = `${siteUrl()}/api/sms/inbound`;
  const signature = req.headers.get("x-twilio-signature") ?? "";
  if (!validTwilioSignature(token, url, params, signature)) {
    return new NextResponse("bad signature", { status: 403 });
  }

  const from = params.From ?? "";
  if (!/^\+\d{8,15}$/.test(from)) return xml(twiml(null)); // short codes / malformed senders: ignore

  try {
    const { reply } = await handleInbound(from, params.Body ?? "", params.MessageSid ?? null);
    return xml(twiml(reply));
  } catch (err) {
    // Never error back to Twilio (it would retry and could double-send); log and stay quiet.
    console.error("[sms] inbound failed:", err);
    return xml(twiml(null));
  }
}

const xml = (body: string) => new NextResponse(body, { headers: { "Content-Type": "text/xml; charset=utf-8" } });
