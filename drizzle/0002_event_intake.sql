ALTER TABLE "events" ALTER COLUMN "owner_id" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "events" ADD COLUMN "contact_name" text;--> statement-breakpoint
ALTER TABLE "events" ADD COLUMN "contact_email" text;--> statement-breakpoint
ALTER TABLE "events" ADD COLUMN "contact_phone" text;--> statement-breakpoint
ALTER TABLE "events" ADD COLUMN "created_by_id" uuid;--> statement-breakpoint
ALTER TABLE "events" ADD COLUMN "cocktails_time" text;--> statement-breakpoint
ALTER TABLE "events" ADD COLUMN "ceremony_time" text;--> statement-breakpoint
ALTER TABLE "events" ADD COLUMN "dessert_time" text;--> statement-breakpoint
ALTER TABLE "events" ADD COLUMN "venue_access_time" text;--> statement-breakpoint
ALTER TABLE "events" ADD COLUMN "venue_out_time" text;--> statement-breakpoint
ALTER TABLE "events" ADD COLUMN "groom_name" text;--> statement-breakpoint
ALTER TABLE "events" ADD COLUMN "groom_parents" text;--> statement-breakpoint
ALTER TABLE "events" ADD COLUMN "bride_name" text;--> statement-breakpoint
ALTER TABLE "events" ADD COLUMN "bride_parents" text;--> statement-breakpoint
ALTER TABLE "events" ADD COLUMN "groom_contact_name" text;--> statement-breakpoint
ALTER TABLE "events" ADD COLUMN "groom_contact_phone" text;--> statement-breakpoint
ALTER TABLE "events" ADD COLUMN "groom_contact_email" text;--> statement-breakpoint
ALTER TABLE "events" ADD COLUMN "bride_contact_name" text;--> statement-breakpoint
ALTER TABLE "events" ADD COLUMN "bride_contact_phone" text;--> statement-breakpoint
ALTER TABLE "events" ADD COLUMN "bride_contact_email" text;--> statement-breakpoint
ALTER TABLE "events" ADD COLUMN "planner_name" text;--> statement-breakpoint
ALTER TABLE "events" ADD COLUMN "planner_company" text;--> statement-breakpoint
ALTER TABLE "events" ADD COLUMN "planner_phone" text;--> statement-breakpoint
ALTER TABLE "events" ADD COLUMN "planner_email" text;--> statement-breakpoint
ALTER TABLE "events" ADD COLUMN "details_locked_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "events" ADD COLUMN "details_locked_by_id" uuid;--> statement-breakpoint
ALTER TABLE "venues" ADD COLUMN "address" text;--> statement-breakpoint
ALTER TABLE "venues" ADD COLUMN "contact_name" text;--> statement-breakpoint
ALTER TABLE "venues" ADD COLUMN "contact_phone" text;--> statement-breakpoint
ALTER TABLE "venues" ADD COLUMN "contact_email" text;--> statement-breakpoint
ALTER TABLE "events" ADD CONSTRAINT "events_created_by_id_users_id_fk" FOREIGN KEY ("created_by_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "events" ADD CONSTRAINT "events_details_locked_by_id_users_id_fk" FOREIGN KEY ("details_locked_by_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;