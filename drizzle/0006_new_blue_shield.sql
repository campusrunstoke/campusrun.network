CREATE TABLE "wallet_cards" (
	"id" text PRIMARY KEY NOT NULL,
	"campaign_id" uuid NOT NULL,
	"active" boolean DEFAULT true NOT NULL,
	"batch_label" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "wallet_cards" ADD CONSTRAINT "wallet_cards_campaign_id_wallet_campaigns_id_fk" FOREIGN KEY ("campaign_id") REFERENCES "public"."wallet_campaigns"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "wallet_cards_campaign_idx" ON "wallet_cards" USING btree ("campaign_id");