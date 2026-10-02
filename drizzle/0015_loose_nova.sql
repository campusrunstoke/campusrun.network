CREATE TABLE "wallet_assets" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"campaign_id" uuid NOT NULL,
	"kind" text NOT NULL,
	"name" text,
	"mime" text NOT NULL,
	"data" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "wallet_campaigns" ADD COLUMN "design" jsonb;--> statement-breakpoint
ALTER TABLE "wallet_assets" ADD CONSTRAINT "wallet_assets_campaign_id_wallet_campaigns_id_fk" FOREIGN KEY ("campaign_id") REFERENCES "public"."wallet_campaigns"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "wallet_assets_campaign_idx" ON "wallet_assets" USING btree ("campaign_id");