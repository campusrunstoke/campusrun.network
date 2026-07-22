import { NextRequest, NextResponse, after } from "next/server";
import { db } from "@/lib/db";
import { leads } from "@/lib/db/schema";
import { leadSchema } from "@/lib/validation";
import { rateLimit } from "@/lib/rate-limit";
import { notifyNewLead } from "@/lib/email";
import { siteUrl } from "@/lib/campaigns";

// postgres.js + nodemailer both need the Node runtime.
export const runtime = "nodejs";

// Tighter than /api/submit: a brand fills this in once, not once per tap.
const MAX = Number(process.env.LEAD_RATE_LIMIT_MAX ?? "5");
const WINDOW_MS = Number(process.env.LEAD_RATE_LIMIT_WINDOW_SECONDS ?? "600") * 1000;

function clientIp(req: NextRequest): string {
  const xff = req.headers.get("x-forwarded-for");
  if (xff) return xff.split(",")[0].trim();
  return req.headers.get("x-real-ip") ?? "unknown";
}

export async function POST(req: NextRequest) {
  const ip = clientIp(req);

  const rl = rateLimit(`lead:${ip}`, MAX, WINDOW_MS);
  if (!rl.ok) {
    return NextResponse.json(
      { ok: false, error: "rate_limited" },
      { status: 429, headers: { "Retry-After": String(rl.retryAfterSeconds ?? 600) } },
    );
  }

  if (Number(req.headers.get("content-length") ?? "0") > 16_384) {
    return NextResponse.json({ ok: false, error: "too_large" }, { status: 413 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: "bad_json" }, { status: 400 });
  }

  const parsed = leadSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ ok: false, error: "invalid" }, { status: 422 });
  }
  const d = parsed.data;

  // Honeypot tripped → pretend success, store nothing.
  if (d.website2 && d.website2.trim() !== "") {
    return NextResponse.json({ ok: true });
  }

  const [lead] = await db
    .insert(leads)
    .values({
      company: d.company,
      contactName: d.contactName,
      email: d.email,
      role: d.role,
      phone: d.phone,
      website: d.website,
      interests: d.interests,
      campuses: d.campuses,
      timeline: d.timeline,
      budget: d.budget,
      message: d.message,
      heardFrom: d.heardFrom,
      userAgent: req.headers.get("user-agent")?.slice(0, 512) ?? null,
    })
    .returning();

  // The lead is safely in the DB — notify after the response so a slow or broken
  // mail server can never make the form feel slow or look like it failed.
  after(async () => {
    await notifyNewLead(lead, `${siteUrl()}/admin/leads`);
  });

  return NextResponse.json({ ok: true });
}
