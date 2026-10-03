DROP INDEX "passes_campaign_card_uq";--> statement-breakpoint
ALTER TABLE "passes" ADD COLUMN "shared" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "sms_entries" ADD COLUMN "pass_serial" text;--> statement-breakpoint
ALTER TABLE "sms_entries" ADD COLUMN "card_id" text;--> statement-breakpoint
ALTER TABLE "wallet_campaigns" ADD COLUMN "card_mode" text DEFAULT 'personal' NOT NULL;--> statement-breakpoint
CREATE UNIQUE INDEX "passes_campaign_card_uq" ON "passes" USING btree ("campaign_id","card_id") WHERE "passes"."shared" = false;