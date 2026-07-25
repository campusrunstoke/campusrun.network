ALTER TABLE "taps" ADD COLUMN "click_id" text;--> statement-breakpoint
ALTER TABLE "taps" ADD COLUMN "referrer" text;--> statement-breakpoint
ALTER TABLE "taps" ADD COLUMN "city" text;--> statement-breakpoint
ALTER TABLE "taps" ADD COLUMN "region" text;--> statement-breakpoint
ALTER TABLE "taps" ADD COLUMN "country" text;--> statement-breakpoint
CREATE INDEX "taps_click_id_idx" ON "taps" USING btree ("click_id");