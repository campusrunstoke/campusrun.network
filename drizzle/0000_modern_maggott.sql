CREATE TABLE "submissions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"rating" smallint NOT NULL,
	"email" text,
	"event_id" text,
	"brand" text,
	"card_number" text,
	"user_agent" text,
	"campaign_id" uuid,
	CONSTRAINT "submissions_rating_range" CHECK ("submissions"."rating" >= 1 AND "submissions"."rating" <= 5)
);
--> statement-breakpoint
CREATE INDEX "submissions_created_at_idx" ON "submissions" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "submissions_brand_event_idx" ON "submissions" USING btree ("brand","event_id");