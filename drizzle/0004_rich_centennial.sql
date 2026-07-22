CREATE TYPE "public"."lead_status" AS ENUM('new', 'contacted', 'qualified', 'closed');--> statement-breakpoint
CREATE TABLE "leads" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"company" text NOT NULL,
	"contact_name" text NOT NULL,
	"email" text NOT NULL,
	"role" text,
	"phone" text,
	"website" text,
	"interests" text[] DEFAULT '{}'::text[] NOT NULL,
	"campuses" text,
	"timeline" text,
	"budget" text,
	"message" text,
	"heard_from" text,
	"status" "lead_status" DEFAULT 'new' NOT NULL,
	"user_agent" text
);
--> statement-breakpoint
CREATE INDEX "leads_created_at_idx" ON "leads" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "leads_status_idx" ON "leads" USING btree ("status");