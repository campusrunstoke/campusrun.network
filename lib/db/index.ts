import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  throw new Error("DATABASE_URL is not set");
}

// Reuse one client across hot reloads (dev) and warm serverless invocations (prod)
// so we don't leak connections. `prepare: false` is required for transaction-mode
// poolers like Neon's / PgBouncer.
const globalForDb = globalThis as unknown as {
  __campusrunClient?: ReturnType<typeof postgres>;
};

const client =
  globalForDb.__campusrunClient ?? postgres(connectionString, { prepare: false });

if (process.env.NODE_ENV !== "production") {
  globalForDb.__campusrunClient = client;
}

export const db = drizzle(client, { schema });
export { schema };
