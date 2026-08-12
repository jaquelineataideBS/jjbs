import { and, asc, count, eq, max, ne, sql } from "drizzle-orm";
import { getDb } from "../../../../db";
import { auditLogs, serviceCategories, services } from "../../../../db/schema";
import { requirePermission } from "../../../../lib/admin";
import { normalizeCategoryName } from "../../../../lib/categories";

function noStore(data: Record<string, unknown>, status = 200) {
  return Response.json(data, { status, headers: { "Cache-Control": "no-store" } });
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

export async function GET(request: Request) {
  try {
    if (!await requirePermission(request, "services")) return noStore({ message: "Acesso restrito ao catálogo de serviços." }, 403);
    const db = await getDb();
    const categories = await db.select({
      id: serviceCategories.id,
      name: serviceCategories.name,
      displayOrder: serviceCategories.displayOrder,
      serviceCount: count(services.id),
    }).from(serviceCategories)
      .leftJoin(services, eq(services.categoryId, serviceCategories.id))
      .where(eq(serviceCategories.active, true))
      .groupBy(serviceCategories.id, serviceCategories.name, serviceCategories.displayOrder)
      .orderBy(asc(serviceCategories.displayOrder), asc(serviceCategories.name));
    return noStore({ categories });
  } catch {
    return noStore({ message: "Não foi possível carregar as categorias." }, 500);
  }
}

export async function POST(request: Request) {
  try {
    const admin = await requirePermission(request, "services");
    if (!admin) return noStore({ message: "Acesso restrito ao catálogo de serviços." }, 403);
    const body: unknown = await request.json();
    const name = isRecord(body) ? normalizeCategoryName(body.name) : null;
    if (!name) return noStore({ message: "Informe um nome de categoria entre 2 e 80 caracteres." }, 400);

    const db = await getDb();
    const [duplicate] = await db.select({ id: serviceCategories.id }).from(serviceCategories)
      .where(sql`lower(${serviceCategories.name}) = lower(${name})`).limit(1);
    if (duplicate) return noStore({ message: "Já existe uma categoria com este nome." }, 409);
    const [lastOrder] = await db.select({ value: max(serviceCategories.displayOrder) }).from(serviceCategories);
    const id = crypto.randomUUID();
    const [category] = await db.insert(serviceCategories).values({ id, name, displayOrder: (lastOrder?.value ?? -1) + 1, active: true }).returning();
    await db.insert(auditLogs).values({ id: crypto.randomUUID(), userId: admin.id, action: "service_category.created", entity: "service_category", entityId: id, metadata: { name } });
    return noStore({ category, message: "Categoria criada." }, 201);
  } catch {
    return noStore({ message: "Não foi possível criar a categoria." }, 500);
  }
}

export async function PATCH(request: Request) {
  try {
    const admin = await requirePermission(request, "services");
    if (!admin) return noStore({ message: "Acesso restrito ao catálogo de serviços." }, 403);
    const body: unknown = await request.json();
    const id = isRecord(body) && typeof body.id === "string" ? body.id.trim() : "";
    const name = isRecord(body) ? normalizeCategoryName(body.name) : null;
    if (!id || !name) return noStore({ message: "Revise o nome da categoria." }, 400);

    const db = await getDb();
    const [duplicate] = await db.select({ id: serviceCategories.id }).from(serviceCategories)
      .where(and(sql`lower(${serviceCategories.name}) = lower(${name})`, ne(serviceCategories.id, id))).limit(1);
    if (duplicate) return noStore({ message: "Já existe uma categoria com este nome." }, 409);
    const [category] = await db.update(serviceCategories).set({ name, updatedAt: new Date() })
      .where(and(eq(serviceCategories.id, id), eq(serviceCategories.active, true))).returning();
    if (!category) return noStore({ message: "Categoria não encontrada." }, 404);
    await db.insert(auditLogs).values({ id: crypto.randomUUID(), userId: admin.id, action: "service_category.updated", entity: "service_category", entityId: id, metadata: { name } });
    return noStore({ category, message: "Categoria atualizada." });
  } catch {
    return noStore({ message: "Não foi possível atualizar a categoria." }, 500);
  }
}

export async function DELETE(request: Request) {
  try {
    const admin = await requirePermission(request, "services");
    if (!admin) return noStore({ message: "Acesso restrito ao catálogo de serviços." }, 403);
    const body: unknown = await request.json();
    const id = isRecord(body) && typeof body.id === "string" ? body.id.trim() : "";
    if (!id) return noStore({ message: "Categoria inválida." }, 400);

    const db = await getDb();
    const [usage] = await db.select({ value: count() }).from(services).where(eq(services.categoryId, id));
    if ((usage?.value ?? 0) > 0) return noStore({ message: "Mova ou remova os serviços desta categoria antes de excluí-la." }, 409);
    const [category] = await db.delete(serviceCategories).where(eq(serviceCategories.id, id)).returning({ id: serviceCategories.id, name: serviceCategories.name });
    if (!category) return noStore({ message: "Categoria não encontrada." }, 404);
    await db.insert(auditLogs).values({ id: crypto.randomUUID(), userId: admin.id, action: "service_category.deleted", entity: "service_category", entityId: id, metadata: { name: category.name } });
    return noStore({ deleted: true, message: "Categoria excluída." });
  } catch {
    return noStore({ message: "Não foi possível excluir a categoria." }, 500);
  }
}
