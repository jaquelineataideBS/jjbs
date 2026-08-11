import { and, asc, eq, gte, lte } from "drizzle-orm";
import { getDb } from "../../../db";
import { promotionServices, promotions, services } from "../../../db/schema";
import { todayInFortaleza } from "../../../lib/scheduling";

export async function GET() {
  try {
    const db = await getDb();
    const today = todayInFortaleza();
    const rows = await db
      .select()
      .from(promotions)
      .where(and(eq(promotions.active, true), lte(promotions.startDate, today), gte(promotions.endDate, today)))
      .orderBy(asc(promotions.endDate))
      .limit(100);
    const links = rows.length
      ? await db
          .select({ promotionId: promotionServices.promotionId, serviceName: services.name })
          .from(promotionServices)
          .innerJoin(services, eq(services.id, promotionServices.serviceId))
      : [];
    return Response.json({
      promotions: rows.map((promotion) => ({
        ...promotion,
        services: links.filter((link) => link.promotionId === promotion.id).map((link) => link.serviceName),
      })),
    }, { headers: { "Cache-Control": "no-store" } });
  } catch {
    return Response.json({ message: "Não foi possível carregar as promoções." }, { status: 500, headers: { "Cache-Control": "no-store" } });
  }
}
