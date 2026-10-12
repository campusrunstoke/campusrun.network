CREATE TABLE "offer_claims" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"campaign_id" uuid NOT NULL,
	"pass_serial" text NOT NULL,
	"card_id" text,
	"answer" text,
	"phone" text,
	"sms_opt_in" boolean DEFAULT false NOT NULL,
	"consent_text" text,
	"consented_at" timestamp with time zone,
	"user_agent" text
);
--> statement-breakpoint
ALTER TABLE "wallet_campaigns" ADD COLUMN "offer_page" jsonb;--> statement-breakpoint
ALTER TABLE "offer_claims" ADD CONSTRAINT "offer_claims_campaign_id_wallet_campaigns_id_fk" FOREIGN KEY ("campaign_id") REFERENCES "public"."wallet_campaigns"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "offer_claims_campaign_pass_uq" ON "offer_claims" USING btree ("campaign_id","pass_serial");