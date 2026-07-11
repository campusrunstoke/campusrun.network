import { sql } from "drizzle-orm";
import {
  pgTable,
  pgEnum,
  uuid,
  timestamp,
  smallint,
  text,
  index,
  check,
} from "drizzle-orm/pg-core";

/**
 * One row per NFC-tap submission.
 *
 * v1 stores the raw attribution params (e/b/c) denormalized on every row — this
 * keeps CSV export trivial forever and needs zero lookups at write time (the reason
 * the page is fast on bad LTE). `campaignId` is intentionally nullable now: when the
 * future card registry lands (campaigns + cards tables), it becomes an additive
 * migration + backfill, not a rewrite.
 */
export const submissions = pgTable(
  "submissions",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),

    // Required. 1–5. Enforced in the app AND with a DB check constraint below.
    rating: smallint("rating").notNull(),

    // Optional — free stuff has no strings. Null when the tapper skips it.
    email: text("email"),

    // Attribution from the URL. All nullable: missing params must never break a write.
    eventId: text("event_id"), // ?e=  event / drop id
    brand: text("brand"), // ?b=  brand
    cardNumber: text("card_number"), // ?c=  physical card number

    userAgent: text("user_agent"),

    // Future card registry. Null in v1.
    campaignId: uuid("campaign_id"),
  },
  (t) => [
    index("submissions_created_at_idx").on(t.createdAt),
    index("submissions_brand_event_idx").on(t.brand, t.eventId),
    check("submissions_rating_range", sql`${t.rating} >= 1 AND ${t.rating} <= 5`),
  ],
);

export type Submission = typeof submissions.$inferSelect;
export type NewSubmission = typeof submissions.$inferInsert;

/** Admin accounts. Passwords are argon2id-hashed — never stored in plaintext. */
export const adminRoleEnum = pgEnum("admin_role", ["owner", "admin"]);

export const admins = pgTable("admins", {
  id: uuid("id").defaultRandom().primaryKey(),
  email: text("email").notNull().unique(), // stored lowercased
  name: text("name").notNull(),
  passwordHash: text("password_hash").notNull(),
  role: adminRoleEnum("role").notNull().default("admin"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  lastLoginAt: timestamp("last_login_at", { withTimezone: true }),
});

/**
 * Server-side sessions — the cookie holds a random token; we store only its
 * SHA-256 hash, so a DB leak can't be replayed. Rows are revocable (logout) and
 * expiring, which stateless JWTs can't do.
 */
export const adminSessions = pgTable(
  "admin_sessions",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    tokenHash: text("token_hash").notNull().unique(),
    adminId: uuid("admin_id")
      .notNull()
      .references(() => admins.id, { onDelete: "cascade" }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    userAgent: text("user_agent"),
  },
  (t) => [
    index("admin_sessions_admin_id_idx").on(t.adminId),
    index("admin_sessions_expires_at_idx").on(t.expiresAt),
  ],
);

export type Admin = typeof admins.$inferSelect;
export type AdminSession = typeof adminSessions.$inferSelect;
