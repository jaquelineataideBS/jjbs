CREATE TABLE "salon_settings" (
	"id" text PRIMARY KEY NOT NULL,
	"salon_name" text NOT NULL,
	"logo_url" text,
	"address" text,
	"phone" text,
	"whatsapp" text,
	"instagram" text,
	"cancellation_hours" integer DEFAULT 24 NOT NULL,
	"deposit_percent" integer DEFAULT 0 NOT NULL,
	"tolerance_minutes" integer DEFAULT 15 NOT NULL,
	"reschedule_allowed" boolean DEFAULT true NOT NULL,
	"no_show_block_threshold" integer DEFAULT 3 NOT NULL,
	"no_show_block_days" integer DEFAULT 30 NOT NULL,
	"cancellation_policy" text NOT NULL,
	"privacy_policy" text NOT NULL,
	"homepage_headline" text,
	"homepage_description" text,
	"banner_image_url" text,
	"primary_color" text DEFAULT '#0B0B0B' NOT NULL,
	"accent_color" text DEFAULT '#D4AF37' NOT NULL,
	"updated_by" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "waitlist_entries" (
	"id" text PRIMARY KEY NOT NULL,
	"client_id" text,
	"service_id" text NOT NULL,
	"professional_id" text,
	"name" text NOT NULL,
	"phone" text NOT NULL,
	"desired_date" text NOT NULL,
	"period" text DEFAULT 'any' NOT NULL,
	"notes" text,
	"status" text DEFAULT 'waiting' NOT NULL,
	"created_by" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "salon_settings" ADD CONSTRAINT "salon_settings_updated_by_users_id_fk" FOREIGN KEY ("updated_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "waitlist_entries" ADD CONSTRAINT "waitlist_entries_client_id_clients_id_fk" FOREIGN KEY ("client_id") REFERENCES "public"."clients"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "waitlist_entries" ADD CONSTRAINT "waitlist_entries_service_id_services_id_fk" FOREIGN KEY ("service_id") REFERENCES "public"."services"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "waitlist_entries" ADD CONSTRAINT "waitlist_entries_professional_id_professionals_id_fk" FOREIGN KEY ("professional_id") REFERENCES "public"."professionals"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "waitlist_entries" ADD CONSTRAINT "waitlist_entries_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "waitlist_status_date_idx" ON "waitlist_entries" USING btree ("status","desired_date");--> statement-breakpoint
CREATE INDEX "waitlist_service_idx" ON "waitlist_entries" USING btree ("service_id");