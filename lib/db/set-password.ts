import { config } from "dotenv";
config({ path: process.env.ENV_FILE ? [process.env.ENV_FILE] : [".env.local", ".env"] });
import readline from "node:readline";

/**
 * Change an existing admin's password, and sign them out everywhere (old sessions die
 * with the old password).
 *
 *   npm run admin:password                       → prompts; the password is never echoed
 *   ENV_FILE=.env.vercel.local npm run admin:password   → same, against production
 *
 * Scripted: ADMIN_EMAIL + ADMIN_PASSWORD env vars instead of the prompts.
 */
async function prompt(): Promise<{ email: string; password: string }> {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  const rlAny = rl as unknown as { _writeToOutput: (s: string) => void; output: NodeJS.WriteStream };
  const write = rlAny._writeToOutput.bind(rlAny);
  const ask = (q: string, hidden = false) =>
    new Promise<string>((resolve) => {
      rlAny._writeToOutput = (s: string) => {
        if (!hidden) return write(s);
        if (s.startsWith(q)) rlAny.output.write(q);
      };
      rl.question(q, (a) => {
        if (hidden) rlAny.output.write("\n");
        resolve(a);
      });
    });
  const email = (await ask("Admin email: ")).trim().toLowerCase();
  const password = await ask("New password (min 10 chars): ", true);
  rl.close();
  return { email, password };
}

async function main() {
  const { email, password } = process.stdin.isTTY && !process.env.ADMIN_PASSWORD
    ? await prompt()
    : { email: (process.env.ADMIN_EMAIL ?? "").trim().toLowerCase(), password: process.env.ADMIN_PASSWORD ?? "" };
  if (!email || password.length < 10) {
    console.error("\n✗ Need an admin email and a password of at least 10 characters.");
    process.exit(1);
  }

  const { db } = await import("./index");
  const { admins, adminSessions } = await import("./schema");
  const { hashPassword } = await import("../auth/password");
  const { eq } = await import("drizzle-orm");

  const [admin] = await db.select().from(admins).where(eq(admins.email, email)).limit(1);
  if (!admin) {
    console.error(`\n✗ No admin with email ${email}.`);
    process.exit(1);
  }
  await db.update(admins).set({ passwordHash: await hashPassword(password) }).where(eq(admins.id, admin.id));
  const ended = await db.delete(adminSessions).where(eq(adminSessions.adminId, admin.id)).returning({ id: adminSessions.id });
  console.log(`\n✓ Password changed for ${email}. Signed out of ${ended.length} session(s).\n`);
  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
