ALTER TABLE "wallet_campaigns" ADD COLUMN "venue_region" text;--> statement-breakpoint
ALTER TABLE "wallet_campaigns" ADD COLUMN "venue_room" text;--> statement-breakpoint
ALTER TABLE "wallet_campaigns" ADD COLUMN "event_starts_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "wallet_campaigns" ADD COLUMN "event_ends_at" timestamp with time zone;