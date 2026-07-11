import { config } from "dotenv";
// ENV_FILE lets prod ops load a separate file (e.g. .env.vercel.local) so the
// connection string never has to be typed on the command line.
config({ path: process.env.ENV_FILE ? [process.env.ENV_FILE] : [".env.local", ".env"] });
import { drizzle } from "drizzle-orm/postgres-js";
import { migrate } from "drizzle-orm/postgres-js/migrator";
import postgres from "postgres";

async function main() {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL is not set");

  // prepare:false keeps this safe against transaction-mode poolers (Neon / PgBouncer).
  const client = postgres(url, { max: 1, prepare: false });
  const db = drizzle(client);
  await migrate(db, { migrationsFolder: "./drizzle" });
  await client.end();
  console.log("✓ Migrations applied");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
