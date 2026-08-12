DROP INDEX "business_hours_professional_weekday_unique";--> statement-breakpoint
CREATE INDEX "business_hours_professional_weekday_idx" ON "business_hours" USING btree ("professional_id","weekday");