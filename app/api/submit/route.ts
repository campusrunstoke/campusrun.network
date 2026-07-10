import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { submissions } from "@/lib/db/schema";
import { submissionSchema } from "@/lib/validation";
import { rateLimit } from "@/lib/rate-limit";

// postgres.js needs the Node runtime (not edge).
export const runtime = "nodejs";

const MAX = Number(process.env.RATE_LIMIT_MAX ?? "20");
const WINDOW_MS = Number(process.env.RATE_LIMIT_WINDOW_SECONDS ?? "60") * 1000;

function clientIp(req: NextRequest): string {
  const xff = req.headers.get("x-forwarded-for");
  if (xff) return xff.split(",")[0].trim();
  return req.headers.get("x-real-ip") ?? "unknown";
}

/** No-op (returns true) unless TURNSTILE_SECRET_KEY is configured. */
async function verifyTurnstile(token: string | undefined, ip: string): Promise<boolean> {
  const secret = process.env.TURNSTILE_SECRET_KEY;
  if (!secret) return true;
  if (!token) return false;
  const res = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ secret, response: token, remoteip: ip }),
  });
  const data = (await res.json()) as { success?: boolean };
  return data.success === true;
}

export async function POST(req: NextRequest) {
  const ip = clientIp(req);

  const rl = rateLimit(ip, MAX, WINDOW_MS);
  if (!rl.ok) {
    return NextResponse.json(
      { ok: false, error: "rate_limited" },
      { status: 429, headers: { "Retry-After": String(rl.retryAfterSeconds ?? 60) } },
    );
  }

  // Reject oversized bodies before reading them.
  if (Number(req.headers.get("content-length") ?? "0") > 4096) {
    return NextResponse.json({ ok: false, error: "too_large" }, { status: 413 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: "bad_json" }, { status: 400 });
  }

  const parsed = submissionSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ ok: false, error: "invalid" }, { status: 422 });
  }
  const { rating, email, e, b, c, website } = parsed.data;

  // Honeypot tripped → pretend success, store nothing.
  if (website && website.trim() !== "") {
    return NextResponse.json({ ok: true });
  }

  const token = (body as { turnstileToken?: string }).turnstileToken;
  if (!(await verifyTurnstile(token, ip))) {
    return NextResponse.json({ ok: false, error: "bot_check_failed" }, { status: 403 });
  }

  const userAgent = req.headers.get("user-agent")?.slice(0, 512) ?? null;

  await db.insert(submissions).values({
    rating,
    email: email ?? null,
    eventId: e ?? null,
    brand: b ?? null,
    cardNumber: c ?? null,
    userAgent,
  });

  return NextResponse.json({ ok: true });
}
