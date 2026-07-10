import { config } from "dotenv";
config({ path: [".env.local", ".env"] });

/** A few rows so /admin and CSV export have something to show locally. */
async function main() {
  // Dynamic import so env is loaded before ./index reads DATABASE_URL.
  const { db } = await import("./index");
  const { submissions } = await import("./schema");

  await db.insert(submissions).values([
    { rating: 5, email: "stoked@example.com", eventId: "test", brand: "daps", cardNumber: "1", userAgent: "seed" },
    { rating: 4, email: null, eventId: "test", brand: "daps", cardNumber: "2", userAgent: "seed" },
    { rating: 3, email: "meh@example.com", eventId: "ucla-w1", brand: "lg", cardNumber: null, userAgent: "seed" },
  ]);
  console.log("✓ Seeded 3 submissions");
  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
