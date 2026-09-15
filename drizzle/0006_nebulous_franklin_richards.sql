CREATE TYPE "public"."device_type" AS ENUM('ios', 'android', 'other');--> statement-breakpoint
CREATE TYPE "public"."gate_mode" AS ENUM('none', 'email', 'phone');--> statement-breakpoint
CREATE TYPE "public"."link_action" AS ENUM('map', 'website', 'video', 'shop');--> statement-breakpoint
CREATE TYPE "public"."pass_status" AS ENUM('created', 'added', 'removed');--> statement-breakpoint
CREATE TYPE "public"."redemption_method" AS ENUM('staff_scan', 'receipt', 'shopify', 'promo_code', 'manual');--> statement-breakpoint
CREATE TYPE "public"."wallet_event_type" AS ENUM('tap', 'pass_added', 'pass_removed', 'click', 'redemption');--> statement-breakpoint
CREATE TABLE "pass_registrations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"device_library_id" text NOT NULL,
	"pass_serial" text NOT NULL,
	"push_token" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "passes" (
	"serial" text PRIMARY KEY NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"card_id" text NOT NULL,
	"campaign_id" uuid NOT NULL,
	"auth_token_hash" text NOT NULL,
	"status" "pass_status" DEFAULT 'created' NOT NULL,
	"added_at" timestamp with time zone,
	"removed_at" timestamp with time zone,
	"redeemed_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "wallet_campaigns" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"brand" text NOT NULL,
	"name" text NOT NULL,
	"venue" text,
	"active" boolean DEFAULT true NOT NULL,
	"gate_mode" "gate_mode" DEFAULT 'none' NOT NULL,
	"pass_type_identifier" text,
	"created_by" uuid
);
--> statement-breakpoint
CREATE TABLE "wallet_cards" (
	"id" text PRIMARY KEY NOT NULL,
	"campaign_id" uuid NOT NULL,
	"active" boolean DEFAULT true NOT NULL,
	"batch_label" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "wallet_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"type" "wallet_event_type" NOT NULL,
	"campaign_id" uuid,
	"card_id" text,
	"pass_serial" text,
	"device_type" "device_type",
	"device_library_id" text,
	"action" "link_action",
	"destination" text,
	"store_id" uuid,
	"store_name" text,
	"method" "redemption_method",
	"amount" numeric(10, 2),
	"user_agent" text,
	"meta" jsonb
);
--> statement-breakpoint
CREATE TABLE "wallet_links" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"campaign_id" uuid NOT NULL,
	"action" "link_action" NOT NULL,
	"label" text,
	"destination" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "wallet_stores" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"campaign_id" uuid,
	"name" text NOT NULL,
	"pin_hash" text,
	"active" boolean DEFAULT true NOT NULL
);
--> statement-breakpoint
ALTER TABLE "pass_registrations" ADD CONSTRAINT "pass_registrations_pass_serial_passes_serial_fk" FOREIGN KEY ("pass_serial") REFERENCES "public"."passes"("serial") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "passes" ADD CONSTRAINT "passes_campaign_id_wallet_campaigns_id_fk" FOREIGN KEY ("campaign_id") REFERENCES "public"."wallet_campaigns"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "wallet_campaigns" ADD CONSTRAINT "wallet_campaigns_created_by_admins_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."admins"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "wallet_cards" ADD CONSTRAINT "wallet_cards_campaign_id_wallet_campaigns_id_fk" FOREIGN KEY ("campaign_id") REFERENCES "public"."wallet_campaigns"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "wallet_events" ADD CONSTRAINT "wallet_events_campaign_id_wallet_campaigns_id_fk" FOREIGN KEY ("campaign_id") REFERENCES "public"."wallet_campaigns"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "wallet_events" ADD CONSTRAINT "wallet_events_store_id_wallet_stores_id_fk" FOREIGN KEY ("store_id") REFERENCES "public"."wallet_stores"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "wallet_links" ADD CONSTRAINT "wallet_links_campaign_id_wallet_campaigns_id_fk" FOREIGN KEY ("campaign_id") REFERENCES "public"."wallet_campaigns"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "wallet_stores" ADD CONSTRAINT "wallet_stores_campaign_id_wallet_campaigns_id_fk" FOREIGN KEY ("campaign_id") REFERENCES "public"."wallet_campaigns"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "pass_registrations_device_pass_uq" ON "pass_registrations" USING btree ("device_library_id","pass_serial");--> statement-breakpoint
CREATE INDEX "pass_registrations_pass_idx" ON "pass_registrations" USING btree ("pass_serial");--> statement-breakpoint
CREATE INDEX "pass_registrations_device_idx" ON "pass_registrations" USING btree ("device_library_id");--> statement-breakpoint
CREATE UNIQUE INDEX "passes_campaign_card_uq" ON "passes" USING btree ("campaign_id","card_id");--> statement-breakpoint
CREATE INDEX "passes_card_idx" ON "passes" USING btree ("card_id");--> statement-breakpoint
CREATE INDEX "wallet_campaigns_brand_idx" ON "wallet_campaigns" USING btree ("brand");--> statement-breakpoint
CREATE INDEX "wallet_cards_campaign_idx" ON "wallet_cards" USING btree ("campaign_id");--> statement-breakpoint
CREATE INDEX "wallet_events_campaign_created_idx" ON "wallet_events" USING btree ("campaign_id","created_at");--> statement-breakpoint
CREATE INDEX "wallet_events_type_idx" ON "wallet_events" USING btree ("type");--> statement-breakpoint
CREATE INDEX "wallet_events_pass_idx" ON "wallet_events" USING btree ("pass_serial");--> statement-breakpoint
CREATE INDEX "wallet_events_card_idx" ON "wallet_events" USING btree ("card_id");--> statement-breakpoint
CREATE UNIQUE INDEX "wallet_links_campaign_action_uq" ON "wallet_links" USING btree ("campaign_id","action");--> statement-breakpoint
CREATE INDEX "wallet_stores_campaign_idx" ON "wallet_stores" USING btree ("campaign_id");