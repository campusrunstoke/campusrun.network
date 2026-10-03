CREATE TABLE "sms_entries" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"program_id" uuid NOT NULL,
	"phone" text NOT NULL,
	"entered_at" timestamp with time zone DEFAULT now() NOT NULL,
	"answer" text,
	"answered_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "sms_messages" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"direction" text NOT NULL,
	"phone" text NOT NULL,
	"body" text NOT NULL,
	"program_id" uuid,
	"kind" text,
	"twilio_sid" text
);
--> statement-breakpoint
CREATE TABLE "sms_opt_outs" (
	"phone" text PRIMARY KEY NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "sms_programs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"name" text NOT NULL,
	"keyword" text NOT NULL,
	"wallet_campaign_id" uuid,
	"open" boolean DEFAULT true NOT NULL,
	"question" text,
	"reply_entry" text NOT NULL,
	"reply_answer" text NOT NULL,
	"reply_wrong_keyword" text NOT NULL,
	"reply_help" text NOT NULL,
	"reply_closed" text NOT NULL
);
--> statement-breakpoint
ALTER TABLE "sms_entries" ADD CONSTRAINT "sms_entries_program_id_sms_programs_id_fk" FOREIGN KEY ("program_id") REFERENCES "public"."sms_programs"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sms_messages" ADD CONSTRAINT "sms_messages_program_id_sms_programs_id_fk" FOREIGN KEY ("program_id") REFERENCES "public"."sms_programs"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sms_programs" ADD CONSTRAINT "sms_programs_wallet_campaign_id_wallet_campaigns_id_fk" FOREIGN KEY ("wallet_campaign_id") REFERENCES "public"."wallet_campaigns"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "sms_entries_program_phone_uq" ON "sms_entries" USING btree ("program_id","phone");--> statement-breakpoint
CREATE INDEX "sms_entries_phone_idx" ON "sms_entries" USING btree ("phone");--> statement-breakpoint
CREATE INDEX "sms_messages_phone_idx" ON "sms_messages" USING btree ("phone","created_at");--> statement-breakpoint
CREATE INDEX "sms_messages_created_idx" ON "sms_messages" USING btree ("created_at");--> statement-breakpoint
CREATE UNIQUE INDEX "sms_programs_keyword_uq" ON "sms_programs" USING btree ("keyword");