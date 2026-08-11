import { asc, eq } from "drizzle-orm";
import { getDb } from "../../../db";
import { portfolioItems } from "../../../db/schema";

export async function GET() {
  try {
    const db = await getDb();
    const items = await db
      .select({
        id: portfolioItems.id,
        title: portfolioItems.title,
        description: portfolioItems.description,
        category: portfolioItems.category,
        mainImageUrl: portfolioItems.mainImageUrl,
        beforeImageUrl: portfolioItems.beforeImageUrl,
        afterImageUrl: portfolioItems.afterImageUrl,
        featured: portfolioItems.featured,
      })
      .from(portfolioItems)
      .where(eq(portfolioItems.published, true))
      .orderBy(asc(portfolioItems.displayOrder), asc(portfolioItems.createdAt))
      .limit(100);
    return Response.json(
      { items },
      { headers: { "Cache-Control": "public, max-age=60, s-maxage=300" } },
    );
  } catch {
    return Response.json(
      { message: "Não foi possível carregar a galeria." },
      { status: 500 },
    );
  }
}
