CREATE TABLE "open_schedule_dates" (
	"id" text PRIMARY KEY NOT NULL,
	"professional_id" text NOT NULL,
	"date" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "open_schedule_dates" ADD CONSTRAINT "open_schedule_dates_professional_id_professionals_id_fk" FOREIGN KEY ("professional_id") REFERENCES "public"."professionals"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "open_schedule_dates_professional_date_unique" ON "open_schedule_dates" USING btree ("professional_id","date");