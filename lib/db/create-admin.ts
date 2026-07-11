import { config } from "dotenv";
config({ path: [".env.local", ".env"] });
import readline from "node:readline";
import { z } from "zod";

type Input = { name: string; email: string; password: string; role: string };

/** Interactive prompts on a real terminal, with masked password entry. */
async function collectInteractive(): Promise<Input> {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  const rlAny = rl as unknown as { _writeToOutput: (s: string) => void; output: NodeJS.WriteStream };
  const defaultWrite = rlAny._writeToOutput.bind(rlAny);

  const ask = (query: string, hidden = false) =>
    new Promise<string>((resolve) => {
      rlAny._writeToOutput = (s: string) => {
        if (!hidden) return defaultWrite(s);
        if (s.startsWith(query)) rlAny.output.write(query); // show label, swallow keystrokes
      };
      rl.question(query, (answer) => {
        if (hidden) rlAny.output.write("\n");
        resolve(answer);
      });
    });

  console.log("\nCreate a Campus Run admin\n");
  const name = (await ask("Name: ")).trim();
  const email = (await ask("Email: ")).trim().toLowerCase();
  const password = await ask("Password (min 10 chars): ", true);
  const role = (await ask("Role [owner]: ")).trim().toLowerCase() || "owner";
  rl.close();
  return { name, email, password, role };
}

/** Non-interactive (CI / scripted): read from env vars. */
function collectFromEnv(): Input {
  return {
    name: (process.env.ADMIN_NAME ?? "").trim(),
    email: (process.env.ADMIN_EMAIL ?? "").trim().toLowerCase(),
    password: process.env.ADMIN_PASSWORD ?? "",
    role: (process.env.ADMIN_ROLE ?? "owner").trim().toLowerCase(),
  };
}

async function main() {
  const raw = process.stdin.isTTY ? await collectInteractive() : collectFromEnv();

  const parsed = z
    .object({
      name: z.string().min(1, "name required"),
      email: z.string().email("valid email required"),
      password: z.string().min(10, "password must be at least 10 chars"),
      role: z.enum(["owner", "admin"]),
    })
    .safeParse(raw);

  if (!parsed.success) {
    console.error("\n✗ Invalid input:", parsed.error.issues.map((i) => i.message).join(", "));
    if (!process.stdin.isTTY) {
      console.error("  (scripted mode reads ADMIN_NAME, ADMIN_EMAIL, ADMIN_PASSWORD, ADMIN_ROLE)");
    }
    process.exit(1);
  }

  const { db } = await import("./index");
  const { admins } = await import("./schema");
  const { hashPassword } = await import("../auth/password");
  const { eq } = await import("drizzle-orm");

  const existing = await db.select().from(admins).where(eq(admins.email, parsed.data.email)).limit(1);
  if (existing.length) {
    console.error(`\n✗ An admin with email ${parsed.data.email} already exists.`);
    process.exit(1);
  }

  await db.insert(admins).values({
    name: parsed.data.name,
    email: parsed.data.email,
    passwordHash: await hashPassword(parsed.data.password),
    role: parsed.data.role,
  });

  console.log(`\n✓ Created ${parsed.data.role} admin: ${parsed.data.email}\n`);
  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
