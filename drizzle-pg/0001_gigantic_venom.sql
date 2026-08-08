CREATE TABLE "blocked_times" (
	"id" text PRIMARY KEY NOT NULL,
	"professional_id" text NOT NULL,
	"block_date" text NOT NULL,
	"start_time" text NOT NULL,
	"end_time" text NOT NULL,
	"reason" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "business_hours" (
	"id" text PRIMARY KEY NOT NULL,
	"professional_id" text NOT NULL,
	"weekday" integer NOT NULL,
	"start_time" text NOT NULL,
	"end_time" text NOT NULL,
	"break_start" text,
	"break_end" text,
	"active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "professional_services" (
	"id" text PRIMARY KEY NOT NULL,
	"professional_id" text NOT NULL,
	"service_id" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "professionals" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"title" text,
	"phone" text,
	"active" boolean DEFAULT true NOT NULL,
	"display_order" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
INSERT INTO "professionals" ("id", "name", "title", "active", "display_order")
VALUES ('jaqueline-justino', 'Jaqueline Justino', 'Fundadora & hairstylist', true, 1)
ON CONFLICT ("id") DO NOTHING;
--> statement-breakpoint
ALTER TABLE "appointments" ADD COLUMN "professional_id" text;--> statement-breakpoint
UPDATE "appointments" SET "professional_id" = 'jaqueline-justino' WHERE "professional_id" IS NULL;
--> statement-breakpoint
ALTER TABLE "blocked_times" ADD CONSTRAINT "blocked_times_professional_id_professionals_id_fk" FOREIGN KEY ("professional_id") REFERENCES "public"."professionals"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "business_hours" ADD CONSTRAINT "business_hours_professional_id_professionals_id_fk" FOREIGN KEY ("professional_id") REFERENCES "public"."professionals"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "professional_services" ADD CONSTRAINT "professional_services_professional_id_professionals_id_fk" FOREIGN KEY ("professional_id") REFERENCES "public"."professionals"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "professional_services" ADD CONSTRAINT "professional_services_service_id_services_id_fk" FOREIGN KEY ("service_id") REFERENCES "public"."services"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "blocked_times_professional_date_idx" ON "blocked_times" USING btree ("professional_id","block_date");--> statement-breakpoint
CREATE UNIQUE INDEX "business_hours_professional_weekday_unique" ON "business_hours" USING btree ("professional_id","weekday");--> statement-breakpoint
CREATE INDEX "business_hours_professional_idx" ON "business_hours" USING btree ("professional_id");--> statement-breakpoint
CREATE INDEX "professional_services_professional_idx" ON "professional_services" USING btree ("professional_id");--> statement-breakpoint
CREATE INDEX "professional_services_service_idx" ON "professional_services" USING btree ("service_id");--> statement-breakpoint
CREATE UNIQUE INDEX "professional_services_unique" ON "professional_services" USING btree ("professional_id","service_id");--> statement-breakpoint
CREATE INDEX "professionals_active_order_idx" ON "professionals" USING btree ("active","display_order");--> statement-breakpoint
INSERT INTO "business_hours" ("id", "professional_id", "weekday", "start_time", "end_time", "break_start", "break_end", "active")
VALUES
  ('jaqueline-hours-1', 'jaqueline-justino', 1, '09:00', '19:00', '12:00', '13:00', true),
  ('jaqueline-hours-2', 'jaqueline-justino', 2, '09:00', '19:00', '12:00', '13:00', true),
  ('jaqueline-hours-3', 'jaqueline-justino', 3, '09:00', '19:00', '12:00', '13:00', true),
  ('jaqueline-hours-4', 'jaqueline-justino', 4, '09:00', '19:00', '12:00', '13:00', true),
  ('jaqueline-hours-5', 'jaqueline-justino', 5, '09:00', '19:00', '12:00', '13:00', true),
  ('jaqueline-hours-6', 'jaqueline-justino', 6, '09:00', '19:00', '12:00', '13:00', true)
ON CONFLICT ("professional_id", "weekday") DO NOTHING;
--> statement-breakpoint
INSERT INTO "professional_services" ("id", "professional_id", "service_id")
SELECT 'jaqueline-service-' || "id", 'jaqueline-justino', "id" FROM "services" WHERE "active" = true
ON CONFLICT ("professional_id", "service_id") DO NOTHING;
--> statement-breakpoint
ALTER TABLE "appointments" ADD CONSTRAINT "appointments_professional_id_professionals_id_fk" FOREIGN KEY ("professional_id") REFERENCES "public"."professionals"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "appointments_professional_slot_idx" ON "appointments" USING btree ("professional_id","appointment_date","start_time","end_time");
