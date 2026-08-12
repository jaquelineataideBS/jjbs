ALTER TABLE "appointments" ADD COLUMN "promotion_id" text;--> statement-breakpoint
ALTER TABLE "appointments" ADD COLUMN "coupon_code" text;--> statement-breakpoint
ALTER TABLE "appointments" ADD COLUMN "discount_cents" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
CREATE INDEX "appointments_promotion_idx" ON "appointments" USING btree ("promotion_id");