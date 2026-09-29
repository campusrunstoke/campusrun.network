ALTER TYPE "public"."link_action" ADD VALUE 'giveaway';--> statement-breakpoint
ALTER TABLE "wallet_campaigns" ADD COLUMN "pass_style" text DEFAULT 'coupon' NOT NULL;--> statement-breakpoint
ALTER TABLE "wallet_campaigns" ADD COLUMN "show_barcode" boolean DEFAULT true NOT NULL;--> statement-breakpoint
ALTER TABLE "wallet_campaigns" ADD COLUMN "giveaway_enabled" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "wallet_campaigns" ADD COLUMN "header_text" text;--> statement-breakpoint
ALTER TABLE "wallet_campaigns" ADD COLUMN "background_png" text;