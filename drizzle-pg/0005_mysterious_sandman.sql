CREATE TABLE "loyalty_accounts" (
	"id" text PRIMARY KEY NOT NULL,
	"client_id" text NOT NULL,
	"points" integer DEFAULT 0 NOT NULL,
	"stamps" integer DEFAULT 0 NOT NULL,
	"referrals" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "loyalty_transactions" (
	"id" text PRIMARY KEY NOT NULL,
	"client_id" text NOT NULL,
	"appointment_id" text,
	"kind" text NOT NULL,
	"points_delta" integer DEFAULT 0 NOT NULL,
	"stamps_delta" integer DEFAULT 0 NOT NULL,
	"referrals_delta" integer DEFAULT 0 NOT NULL,
	"description" text NOT NULL,
	"created_by" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "promotion_services" (
	"id" text PRIMARY KEY NOT NULL,
	"promotion_id" text NOT NULL,
	"service_id" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "promotions" (
	"id" text PRIMARY KEY NOT NULL,
	"title" text NOT NULL,
	"description" text NOT NULL,
	"discount_type" text DEFAULT 'percentage' NOT NULL,
	"discount_value" integer DEFAULT 0 NOT NULL,
	"coupon_code" text,
	"audience" text DEFAULT 'all' NOT NULL,
	"combo_description" text,
	"start_date" text NOT NULL,
	"end_date" text NOT NULL,
	"active" boolean DEFAULT true NOT NULL,
	"featured" boolean DEFAULT false NOT NULL,
	"created_by" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "loyalty_accounts" ADD CONSTRAINT "loyalty_accounts_client_id_clients_id_fk" FOREIGN KEY ("client_id") REFERENCES "public"."clients"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "loyalty_transactions" ADD CONSTRAINT "loyalty_transactions_client_id_clients_id_fk" FOREIGN KEY ("client_id") REFERENCES "public"."clients"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "loyalty_transactions" ADD CONSTRAINT "loyalty_transactions_appointment_id_appointments_id_fk" FOREIGN KEY ("appointment_id") REFERENCES "public"."appointments"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "loyalty_transactions" ADD CONSTRAINT "loyalty_transactions_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "promotion_services" ADD CONSTRAINT "promotion_services_promotion_id_promotions_id_fk" FOREIGN KEY ("promotion_id") REFERENCES "public"."promotions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "promotion_services" ADD CONSTRAINT "promotion_services_service_id_services_id_fk" FOREIGN KEY ("service_id") REFERENCES "public"."services"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "promotions" ADD CONSTRAINT "promotions_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "loyalty_accounts_client_unique" ON "loyalty_accounts" USING btree ("client_id");--> statement-breakpoint
CREATE INDEX "loyalty_transactions_client_date_idx" ON "loyalty_transactions" USING btree ("client_id","created_at");--> statement-breakpoint
CREATE INDEX "loyalty_transactions_appointment_idx" ON "loyalty_transactions" USING btree ("appointment_id");--> statement-breakpoint
CREATE INDEX "promotion_services_promotion_idx" ON "promotion_services" USING btree ("promotion_id");--> statement-breakpoint
CREATE UNIQUE INDEX "promotion_services_unique" ON "promotion_services" USING btree ("promotion_id","service_id");--> statement-breakpoint
CREATE INDEX "promotions_active_date_idx" ON "promotions" USING btree ("active","start_date","end_date");--> statement-breakpoint
CREATE UNIQUE INDEX "promotions_coupon_unique" ON "promotions" USING btree ("coupon_code");