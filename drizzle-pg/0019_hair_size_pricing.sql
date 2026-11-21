ALTER TABLE "services" ADD COLUMN "size_prices" jsonb DEFAULT '{}'::jsonb NOT NULL;
--> statement-breakpoint
UPDATE "services"
SET "size_prices" = jsonb_build_object(
  'P', "price_cents",
  'M', "price_cents",
  'G', "price_cents",
  'EX', "price_cents"
);
--> statement-breakpoint
ALTER TABLE "appointments" ADD COLUMN "hair_size" text;
