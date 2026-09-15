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
  numeric,
  jsonb,
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
    clickId: text("click_id"), // cr_… — unique per tap, echoed to the client as ?cr_cid=
    referrer: text("referrer"), // Referer header (usually empty on NFC taps)
    city: text("city"), // x-vercel-ip-city, decoded — prod only
    region: text("region"), // x-vercel-ip-country-region
    country: text("country"), // x-vercel-ip-country (ISO 3166-1 alpha-2)
    userAgent: text("user_agent"),
  },
  (t) => [
    index("taps_created_at_idx").on(t.createdAt),
    index("taps_brand_event_idx").on(t.brand, t.eventId),
    // Non-unique on purpose: a unique-violation would be swallowed by /go's
    // catch and silently drop the tap. btree is enough for conversion joins.
    index("taps_click_id_idx").on(t.clickId),
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

// ===========================================================================
// Wallet tracking (Deliverable 2)
//
// A student taps an NFC card → a coupon pass lands in Apple Wallet → they tap
// links on the pass → they redeem at a store. Every hop is one row in
// `wallet_events`, keyed to a campaign — that append-only log is the whole
// funnel + CSV. Alongside it, the Apple PassKit web-service protocol needs two
// small STATE tables (`passes`, `pass_registrations`) so we know a pass was
// added/removed and can push updates later. Kept entirely separate from the
// Deliverable-1 `campaigns`/`submissions`/`taps` tables — different product.
// ===========================================================================

/** Future hook (§7): v1 is always "none"; a per-campaign gate flips on later without a rebuild. */
export const gateModeEnum = pgEnum("gate_mode", ["none", "email", "phone"]);

/** The five funnel hops. One row per hop in wallet_events. */
export const walletEventTypeEnum = pgEnum("wallet_event_type", [
  "tap",
  "pass_added",
  "pass_removed",
  "click",
  "redemption",
]);

export const deviceTypeEnum = pgEnum("device_type", ["ios", "android", "other"]);

/** Which link on the pass was tapped (§4 click.action_type). */
export const linkActionEnum = pgEnum("link_action", ["map", "website", "video", "shop"]);

/** How a redemption was captured (§5). staff_scan = option A, receipt = option B, etc. */
export const redemptionMethodEnum = pgEnum("redemption_method", [
  "staff_scan",
  "receipt",
  "shopify",
  "promo_code",
  "manual",
]);

export const passStatusEnum = pgEnum("pass_status", ["created", "added", "removed"]);

/** One brand activation (e.g. "Pocari · Fallapalooza LMU"). Scoped by brand from day one (§7 multi-brand). */
export const walletCampaigns = pgTable(
  "wallet_campaigns",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    brand: text("brand").notNull(),
    name: text("name").notNull(),
    venue: text("venue"), // e.g. "LMU — Fallapalooza"
    active: boolean("active").notNull().default(true),
    gateMode: gateModeEnum("gate_mode").notNull().default("none"),
    // Per-campaign override of the global Pass Type ID (null → use the env default). KC provides later.
    passTypeIdentifier: text("pass_type_identifier"),
    createdBy: uuid("created_by").references(() => admins.id, { onDelete: "set null" }),
  },
  (t) => [index("wallet_campaigns_brand_idx").on(t.brand)],
);

export type WalletCampaign = typeof walletCampaigns.$inferSelect;
export type NewWalletCampaign = typeof walletCampaigns.$inferInsert;

/**
 * Card registry: maps a physical card's id (the {card_id} in /c/{card_id}) to its
 * campaign, so the tap landing resolves the campaign with one lookup and no params in
 * the URL. Cards are minted in a batch when a campaign is created. Repointable later
 * (§7): change campaignId to re-aim a printed card at a new activation.
 */
export const walletCards = pgTable(
  "wallet_cards",
  {
    id: text("id").primaryKey(), // the card_id encoded on the NFC card / QR
    campaignId: uuid("campaign_id")
      .notNull()
      .references(() => walletCampaigns.id, { onDelete: "cascade" }),
    active: boolean("active").notNull().default(true),
    batchLabel: text("batch_label"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("wallet_cards_campaign_idx").on(t.campaignId)],
);

export type WalletCard = typeof walletCards.$inferSelect;

/**
 * Pass-through link destinations (§4). Each link on the pass points at
 * /r/{serial}/{action} and 302s to the destination configured here. Destinations
 * are ALWAYS looked up server-side per (campaign, action) — never taken from a URL
 * param — so our domain can't be turned into an open redirect.
 */
export const walletLinks = pgTable(
  "wallet_links",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    campaignId: uuid("campaign_id")
      .notNull()
      .references(() => walletCampaigns.id, { onDelete: "cascade" }),
    action: linkActionEnum("action").notNull(),
    label: text("label"),
    destination: text("destination").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [uniqueIndex("wallet_links_campaign_action_uq").on(t.campaignId, t.action)],
);

export type WalletLink = typeof walletLinks.$inferSelect;

/**
 * The pass is the spine: one card = one pass = one serial (§4 note). The serial is a
 * random, non-guessable string so /r/ and /redeem/ can't be enumerated. We store only
 * a HASH of the per-pass authentication token — a DB leak can't be replayed against Apple.
 */
export const passes = pgTable(
  "passes",
  {
    serial: text("serial").primaryKey(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    cardId: text("card_id").notNull(), // the {card_id} in /c/{card_id}
    campaignId: uuid("campaign_id")
      .notNull()
      .references(() => walletCampaigns.id, { onDelete: "cascade" }),
    authTokenHash: text("auth_token_hash").notNull(),
    status: passStatusEnum("status").notNull().default("created"),
    addedAt: timestamp("added_at", { withTimezone: true }), // first device registration
    removedAt: timestamp("removed_at", { withTimezone: true }),
    redeemedAt: timestamp("redeemed_at", { withTimezone: true }),
  },
  (t) => [
    uniqueIndex("passes_campaign_card_uq").on(t.campaignId, t.cardId),
    index("passes_card_idx").on(t.cardId),
  ],
);

export type Pass = typeof passes.$inferSelect;
export type NewPass = typeof passes.$inferInsert;

/**
 * Apple PassKit web-service state: which device registered for which pass, and its
 * APNs push token (kept for future push updates §7). A device registering IS the
 * pass_added signal; unregistering is pass_removed.
 */
export const passRegistrations = pgTable(
  "pass_registrations",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    deviceLibraryId: text("device_library_id").notNull(),
    passSerial: text("pass_serial")
      .notNull()
      .references(() => passes.serial, { onDelete: "cascade" }),
    pushToken: text("push_token").notNull(),
  },
  (t) => [
    uniqueIndex("pass_registrations_device_pass_uq").on(t.deviceLibraryId, t.passSerial),
    index("pass_registrations_pass_idx").on(t.passSerial),
    index("pass_registrations_device_idx").on(t.deviceLibraryId),
  ],
);

export type PassRegistration = typeof passRegistrations.$inferSelect;

/** Stores for redemption option A (§5). Store identity = a QR poster at the register; optional staff PIN. */
export const walletStores = pgTable(
  "wallet_stores",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    campaignId: uuid("campaign_id").references(() => walletCampaigns.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    pinHash: text("pin_hash"), // optional staff PIN, argon2-hashed
    active: boolean("active").notNull().default(true),
  },
  (t) => [index("wallet_stores_campaign_idx").on(t.campaignId)],
);

export type WalletStore = typeof walletStores.$inferSelect;

/**
 * The append-only funnel log — every hop is a row here (§3). This one table drives
 * the entire dashboard (funnel, conversion %, device split, per-store, time-series)
 * and the raw CSV export. Denormalized on purpose: zero lookups at write time and
 * trivial export forever, exactly like the Deliverable-1 submissions table.
 */
export const walletEvents = pgTable(
  "wallet_events",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    type: walletEventTypeEnum("type").notNull(),
    // Nullable: a tap on an unknown card is still logged rather than dropped.
    campaignId: uuid("campaign_id").references(() => walletCampaigns.id, { onDelete: "set null" }),
    cardId: text("card_id"),
    passSerial: text("pass_serial"),
    deviceType: deviceTypeEnum("device_type"),
    deviceLibraryId: text("device_library_id"),
    // click
    action: linkActionEnum("action"),
    destination: text("destination"),
    // redemption
    storeId: uuid("store_id").references(() => walletStores.id, { onDelete: "set null" }),
    storeName: text("store_name"),
    method: redemptionMethodEnum("method"),
    amount: numeric("amount", { precision: 10, scale: 2 }),
    userAgent: text("user_agent"),
    meta: jsonb("meta"),
  },
  (t) => [
    index("wallet_events_campaign_created_idx").on(t.campaignId, t.createdAt),
    index("wallet_events_type_idx").on(t.type),
    index("wallet_events_pass_idx").on(t.passSerial),
    index("wallet_events_card_idx").on(t.cardId),
  ],
);

export type WalletEvent = typeof walletEvents.$inferSelect;
export type NewWalletEvent = typeof walletEvents.$inferInsert;
