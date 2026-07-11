import { cookies } from "next/headers";
import { createHash, randomBytes } from "node:crypto";
import { redirect } from "next/navigation";
import { and, eq, gt } from "drizzle-orm";
import { db } from "@/lib/db";
import { admins, adminSessions, type Admin } from "@/lib/db/schema";

export const SESSION_COOKIE = "cr_admin_session";
const SESSION_TTL_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

const sha256 = (v: string) => createHash("sha256").update(v).digest("hex");

/** Issue a session: store only the token's hash, hand the raw token to the cookie. */
export async function createSession(adminId: string, userAgent: string | null): Promise<void> {
  const token = randomBytes(32).toString("base64url");
  const expiresAt = new Date(Date.now() + SESSION_TTL_MS);

  await db.insert(adminSessions).values({
    tokenHash: sha256(token),
    adminId,
    expiresAt,
    userAgent: userAgent?.slice(0, 512) ?? null,
  });

  const jar = await cookies();
  jar.set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    expires: expiresAt,
  });
}

/** Resolve the logged-in admin from the session cookie, or null. */
export async function getCurrentAdmin(): Promise<Admin | null> {
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  if (!token) return null;

  const rows = await db
    .select({ admin: admins })
    .from(adminSessions)
    .innerJoin(admins, eq(admins.id, adminSessions.adminId))
    .where(
      and(eq(adminSessions.tokenHash, sha256(token)), gt(adminSessions.expiresAt, new Date())),
    )
    .limit(1);

  return rows[0]?.admin ?? null;
}

/** For server components: redirect to /admin/login if not authenticated. */
export async function requireAdmin(): Promise<Admin> {
  const admin = await getCurrentAdmin();
  if (!admin) redirect("/admin/login");
  return admin;
}

/** Revoke the current session and clear the cookie. */
export async function destroyCurrentSession(): Promise<void> {
  const jar = await cookies();
  const token = jar.get(SESSION_COOKIE)?.value;
  if (token) {
    await db.delete(adminSessions).where(eq(adminSessions.tokenHash, sha256(token)));
    jar.delete(SESSION_COOKIE);
  }
}
