import { sql } from "drizzle-orm";
import {
  pgTable,
  pgEnum,
  uuid,
  timestamp,
  smallint,
  text,
  boolean,
  index,
  uniqueIndex,
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

/**
 * A campaign is a named (brand, event) pair — one physical drop for one client.
 * It generates the NFC link and groups submissions by matching brand+event, so the
 * capture page stays param-based and lookup-free. (The optional card registry, if we
 * ever add repointable cards, layers on top via submissions.campaign_id.)
 */
// "rating" → capture page (/stoked). "redirect" → log a tap, bounce to destinationUrl.
export const campaignTypeEnum = pgEnum("campaign_type", ["rating", "redirect"]);

export const campaigns = pgTable(
  "campaigns",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    name: text("name").notNull(), // friendly, e.g. "ACME Fall 2025"
    type: campaignTypeEnum("type").notNull().default("rating"),
    destinationUrl: text("destination_url"), // required for type=redirect
    brand: text("brand").notNull(), // b
    eventId: text("event_id").notNull(), // e
    cardNumber: text("card_number"), // c — optional default card for the link
    active: boolean("active").notNull().default(true),
    createdBy: uuid("created_by").references(() => admins.id, { onDelete: "set null" }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [uniqueIndex("campaigns_brand_event_uq").on(t.brand, t.eventId)],
);

export type Campaign = typeof campaigns.$inferSelect;
export type NewCampaign = typeof campaigns.$inferInsert;

/**
 * One row per tap on a redirect (smart-link) campaign — the click counter.
 * Rating campaigns count `submissions`; redirect campaigns count `taps`.
 */
export const taps = pgTable(
  "taps",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    campaignId: uuid("campaign_id").references(() => campaigns.id, { onDelete: "set null" }),
    eventId: text("event_id"),
    brand: text("brand"),
    cardNumber: text("card_number"),
    userAgent: text("user_agent"),
  },
  (t) => [
    index("taps_created_at_idx").on(t.createdAt),
    index("taps_brand_event_idx").on(t.brand, t.eventId),
  ],
);

export type Tap = typeof taps.$inferSelect;
export type NewTap = typeof taps.$inferInsert;

/**
 * Inbound intake — a brand filling in the "work with us" form. Deliberately its own
 * table: this is sales pipeline, not activation telemetry, and it has a different
 * lifecycle (a human works each row) than submissions/taps, which are append-only.
 */
export const leadStatusEnum = pgEnum("lead_status", [
  "new",
  "contacted",
  "qualified",
  "closed",
]);

export const leads = pgTable(
  "leads",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),

    // Required on the form.
    company: text("company").notNull(),
    contactName: text("contact_name").notNull(),
    email: text("email").notNull(), // stored lowercased

    // Optional.
    role: text("role"),
    phone: text("phone"),
    website: text("website"),
    interests: text("interests").array().notNull().default(sql`'{}'::text[]`),
    campuses: text("campuses"), // markets / schools they care about
    timeline: text("timeline"),
    budget: text("budget"),
    message: text("message"),
    heardFrom: text("heard_from"),

    // Pipeline state — the only field admins mutate after the fact.
    status: leadStatusEnum("status").notNull().default("new"),

    userAgent: text("user_agent"),
  },
  (t) => [
    index("leads_created_at_idx").on(t.createdAt),
    index("leads_status_idx").on(t.status),
  ],
);

export type Lead = typeof leads.$inferSelect;
export type NewLead = typeof leads.$inferInsert;
