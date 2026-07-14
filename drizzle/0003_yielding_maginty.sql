CREATE TYPE "public"."campaign_type" AS ENUM('rating', 'redirect');--> statement-breakpoint
CREATE TABLE "taps" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"campaign_id" uuid,
	"event_id" text,
	"brand" text,
	"card_number" text,
	"user_agent" text
);
--> statement-breakpoint
ALTER TABLE "campaigns" ADD COLUMN "type" "campaign_type" DEFAULT 'rating' NOT NULL;--> statement-breakpoint
ALTER TABLE "campaigns" ADD COLUMN "destination_url" text;--> statement-breakpoint
ALTER TABLE "taps" ADD CONSTRAINT "taps_campaign_id_campaigns_id_fk" FOREIGN KEY ("campaign_id") REFERENCES "public"."campaigns"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "taps_created_at_idx" ON "taps" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "taps_brand_event_idx" ON "taps" USING btree ("brand","event_id");