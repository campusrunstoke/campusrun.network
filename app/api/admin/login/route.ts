import { NextRequest, NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/lib/db";
import { admins } from "@/lib/db/schema";
import { verifyPassword, hashPassword } from "@/lib/auth/password";
import { createSession } from "@/lib/auth/session";
import { rateLimit } from "@/lib/rate-limit";

export const runtime = "nodejs";

const schema = z.object({
  email: z.string().trim().toLowerCase().email().max(254),
  password: z.string().min(1).max(200),
});

// A throwaway hash so a missing user costs ~the same time as a wrong password
// (mitigates user-enumeration via timing). Computed once, lazily.
let decoyHash: string | null = null;

function clientIp(req: NextRequest): string {
  const xff = req.headers.get("x-forwarded-for");
  return xff ? xff.split(",")[0].trim() : (req.headers.get("x-real-ip") ?? "unknown");
}

export async function POST(req: NextRequest) {
  const ip = clientIp(req);
  // 10 attempts per 5 minutes per IP.
  if (!rateLimit(`login:${ip}`, 10, 5 * 60 * 1000).ok) {
    return NextResponse.json({ ok: false, error: "rate_limited" }, { status: 429 });
  }

  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ ok: false, error: "invalid" }, { status: 400 });
  }
  const { email, password } = parsed.data;

  const [admin] = await db.select().from(admins).where(eq(admins.email, email)).limit(1);

  if (!admin) {
    decoyHash ??= await hashPassword("decoy-password-never-matches");
    await verifyPassword(decoyHash, password); // equalize timing
    return NextResponse.json({ ok: false, error: "bad_credentials" }, { status: 401 });
  }

  if (!(await verifyPassword(admin.passwordHash, password))) {
    return NextResponse.json({ ok: false, error: "bad_credentials" }, { status: 401 });
  }

  await createSession(admin.id, req.headers.get("user-agent"));
  await db.update(admins).set({ lastLoginAt: new Date() }).where(eq(admins.id, admin.id));

  return NextResponse.json({ ok: true });
}
