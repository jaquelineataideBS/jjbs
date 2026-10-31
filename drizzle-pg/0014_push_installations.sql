CREATE TABLE "push_installations" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"fid" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "push_installations" ADD CONSTRAINT "push_installations_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "push_installations_fid_unique" ON "push_installations" USING btree ("fid");--> statement-breakpoint
CREATE INDEX "push_installations_user_idx" ON "push_installations" USING btree ("user_id");