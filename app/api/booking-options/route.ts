import { asc, eq } from "drizzle-orm";
import { getDb } from "../../../db";
import { serviceCategories, services } from "../../../db/schema";

export async function GET() {
  try {
    const db = await getDb();
    const rows = await db.select({
      id: services.id,
      category: serviceCategories.name,
      name: services.name,
      description: services.description,
      durationMinutes: services.durationMinutes,
      priceCents: services.priceCents,
      priceType: services.priceType,
    }).from(services)
      .leftJoin(serviceCategories, eq(serviceCategories.id, services.categoryId))
      .where(eq(services.active, true))
      .orderBy(asc(serviceCategories.displayOrder), asc(services.name));

    return Response.json({ services: rows }, { headers: { "Cache-Control": "no-store" } });
  } catch {
    return Response.json({ message: "Não foi possível carregar os serviços agora." }, { status: 503, headers: { "Cache-Control": "no-store" } });
  }
}
