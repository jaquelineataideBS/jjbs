ALTER TABLE "professionals" ADD COLUMN "user_id" text;--> statement-breakpoint
ALTER TABLE "professionals" ADD CONSTRAINT "professionals_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "professionals_user_unique" ON "professionals" USING btree ("user_id");