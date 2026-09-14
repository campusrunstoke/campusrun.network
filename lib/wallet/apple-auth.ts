import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { passes, type Pass } from "@/lib/db/schema";
import { tokenMatchesHash } from "./ids";

/**
 * Every authenticated Apple web-service call carries `Authorization: ApplePass <token>`,
 * where <token> is the pass's own authenticationToken. We validate it against the stored
 * hash with a constant-time compare. Returns the pass on success, null otherwise.
 */
export async function authenticatePass(
  authorization: string | null,
  serial: string,
): Promise<Pass | null> {
  if (!authorization) return null;
  const m = /^ApplePass\s+(.+)$/i.exec(authorization.trim());
  if (!m) return null;
  const token = m[1];

  const [pass] = await db.select().from(passes).where(eq(passes.serial, serial)).limit(1);
  if (!pass) return null;
  if (!tokenMatchesHash(token, pass.authTokenHash)) return null;
  return pass;
}
