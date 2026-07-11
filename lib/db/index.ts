import { drizzle, type PostgresJsDatabase } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";

// Lazy singleton: the client is created on first query, NOT at import time.
// This keeps `DATABASE_URL` out of the build (Next evaluates route modules during
// "collecting page data") — it's only required at runtime, when a query actually runs.
let instance: PostgresJsDatabase<typeof schema> | undefined;

function init(): PostgresJsDatabase<typeof schema> {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) throw new Error("DATABASE_URL is not set");

  // Reuse one client across hot reloads (dev) and warm serverless invocations (prod).
  // `prepare: false` is required for transaction-mode poolers like Neon's / PgBouncer.
  const globalForDb = globalThis as unknown as {
    __campusrunClient?: ReturnType<typeof postgres>;
  };
  const client =
    globalForDb.__campusrunClient ?? postgres(connectionString, { prepare: false });
  if (process.env.NODE_ENV !== "production") globalForDb.__campusrunClient = client;

  return drizzle(client, { schema });
}

// `db` behaves like a normal Drizzle instance, but defers construction until first use.
export const db = new Proxy({} as PostgresJsDatabase<typeof schema>, {
  get(_target, prop) {
    if (!instance) instance = init();
    const value = Reflect.get(instance, prop, instance);
    return typeof value === "function" ? value.bind(instance) : value;
  },
});

export { schema };
