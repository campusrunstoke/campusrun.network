ALTER TABLE "wallet_campaigns" ADD COLUMN "text_align" text DEFAULT 'left' NOT NULL;--> statement-breakpoint
ALTER TABLE "wallet_campaigns" ADD COLUMN "suppress_header_darkening" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "wallet_campaigns" ADD COLUMN "hide_header_text" boolean DEFAULT false NOT NULL;