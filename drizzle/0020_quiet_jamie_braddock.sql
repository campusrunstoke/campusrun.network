ALTER TABLE "sms_entries" ADD COLUMN "step" smallint DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "sms_entries" ADD COLUMN "answers" jsonb DEFAULT '[]'::jsonb NOT NULL;--> statement-breakpoint
ALTER TABLE "sms_entries" ADD COLUMN "source" text DEFAULT 'text' NOT NULL;--> statement-breakpoint
ALTER TABLE "sms_programs" ADD COLUMN "steps" jsonb;--> statement-breakpoint
ALTER TABLE "sms_programs" ADD COLUMN "live_sending" boolean DEFAULT false NOT NULL;