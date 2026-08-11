CREATE TABLE "portfolio_items" (
	"id" text PRIMARY KEY NOT NULL,
	"title" text NOT NULL,
	"description" text NOT NULL,
	"category" text NOT NULL,
	"service_id" text,
	"professional_id" text,
	"main_image_url" text NOT NULL,
	"before_image_url" text,
	"after_image_url" text,
	"published" boolean DEFAULT false NOT NULL,
	"featured" boolean DEFAULT false NOT NULL,
	"display_order" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "portfolio_items" ADD CONSTRAINT "portfolio_items_service_id_services_id_fk" FOREIGN KEY ("service_id") REFERENCES "public"."services"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "portfolio_items" ADD CONSTRAINT "portfolio_items_professional_id_professionals_id_fk" FOREIGN KEY ("professional_id") REFERENCES "public"."professionals"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "portfolio_items_published_order_idx" ON "portfolio_items" USING btree ("published","display_order");--> statement-breakpoint
CREATE INDEX "portfolio_items_category_published_idx" ON "portfolio_items" USING btree ("category","published");--> statement-breakpoint
CREATE INDEX "portfolio_items_featured_idx" ON "portfolio_items" USING btree ("featured");
--> statement-breakpoint
INSERT INTO "portfolio_items" ("id", "title", "description", "category", "professional_id", "main_image_url", "published", "featured", "display_order")
VALUES
  ('portfolio-morena-iluminada', 'Morena iluminada com dimensão', 'Coloração global · Brilho natural', 'Coloração', 'jaqueline-justino', 'https://images.unsplash.com/photo-1522337360788-8b13dee7a37e?auto=format&fit=crop&w=1100&q=85', true, true, 1),
  ('portfolio-corte-camadas', 'Camadas que dão movimento', 'Corte feminino · Finalização', 'Cortes', 'jaqueline-justino', 'https://images.unsplash.com/photo-1521590832167-7bcbfaa6381f?auto=format&fit=crop&w=1100&q=85', true, true, 2),
  ('portfolio-hidratacao', 'Brilho e toque renovados', 'Hidratação profunda · Terapia capilar', 'Tratamentos', 'jaqueline-justino', 'https://images.unsplash.com/photo-1516975080664-ed2fc6a32937?auto=format&fit=crop&w=1100&q=85', true, false, 3),
  ('portfolio-penteado-social', 'Presença para uma noite especial', 'Penteado social · Produção', 'Produções', 'jaqueline-justino', 'https://images.unsplash.com/photo-1487412947147-5cebf100ffc2?auto=format&fit=crop&w=1100&q=85', true, false, 4),
  ('portfolio-luz-suave', 'Luz suave, resultado elegante', 'Mechas · Tonalização', 'Coloração', 'jaqueline-justino', 'https://images.unsplash.com/photo-1526045478516-99145907023c?auto=format&fit=crop&w=1100&q=85', true, false, 5),
  ('portfolio-reconstrucao', 'Cuidado para fios danificados', 'Reconstrução · Cronograma', 'Tratamentos', 'jaqueline-justino', 'https://images.unsplash.com/photo-1595476108010-b4d1f102b1b1?auto=format&fit=crop&w=1100&q=85', true, false, 6)
ON CONFLICT ("id") DO NOTHING;
