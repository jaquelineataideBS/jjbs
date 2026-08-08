import { asc, eq } from "drizzle-orm";
import { getDb } from "../../../../db";
import { serviceCategories, services } from "../../../../db/schema";
import { requireAdmin } from "../../../../lib/admin";

type ServiceInput = { id?: string; categoryId: string | null; name: string; description: string; durationMinutes: number; priceType: string; priceCents: number | null; active: boolean };
const priceTypes = new Set(["fixed", "starting_at", "consultation"]);

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function parseService(value: unknown): ServiceInput | null {
  if (!isRecord(value)) return null;
  const categoryId = typeof value.categoryId === "string" && value.categoryId.trim() ? value.categoryId.trim() : null;
  const name = typeof value.name === "string" ? value.name.trim() : "";
  const description = typeof value.description === "string" ? value.description.trim() : "";
  const durationMinutes = typeof value.durationMinutes === "number" ? value.durationMinutes : Number(value.durationMinutes);
  const priceType = typeof value.priceType === "string" ? value.priceType : "fixed";
  const priceCents = value.priceCents === null || value.priceCents === "" ? null : Number(value.priceCents);
  const active = value.active !== false;
  const id = typeof value.id === "string" ? value.id : undefined;

  if (!name || name.length > 120 || !description || description.length > 1000 || !Number.isInteger(durationMinutes) || durationMinutes < 15 || durationMinutes > 720 || !priceTypes.has(priceType)) return null;
  if (priceType !== "consultation" && (priceCents === null || !Number.isInteger(priceCents) || priceCents < 0 || priceCents > 9_999_900)) return null;
  return { id, categoryId, name, description, durationMinutes, priceType, priceCents: priceType === "consultation" ? null : priceCents, active };
}

function noStore(data: Record<string, unknown>, status = 200) {
  return Response.json(data, { status, headers: { "Cache-Control": "no-store" } });
}

export async function GET(request: Request) {
  try {
    if (!await requireAdmin(request)) return noStore({ message: "Acesso restrito ao painel administrativo." }, 403);
    const db = await getDb();
    const [serviceRows, categoryRows] = await Promise.all([
      db.select({ id: services.id, categoryId: services.categoryId, categoryName: serviceCategories.name, name: services.name, description: services.description, durationMinutes: services.durationMinutes, priceType: services.priceType, priceCents: services.priceCents, active: services.active })
        .from(services).leftJoin(serviceCategories, eq(serviceCategories.id, services.categoryId)).orderBy(asc(serviceCategories.displayOrder), asc(services.name)),
      db.select({ id: serviceCategories.id, name: serviceCategories.name }).from(serviceCategories).where(eq(serviceCategories.active, true)).orderBy(asc(serviceCategories.displayOrder)),
    ]);
    return noStore({ services: serviceRows, categories: categoryRows });
  } catch {
    return noStore({ message: "Não foi possível carregar os serviços." }, 500);
  }
}

export async function POST(request: Request) {
  try {
    if (!await requireAdmin(request)) return noStore({ message: "Acesso restrito ao painel administrativo." }, 403);
    const input = parseService(await request.json());
    if (!input) return noStore({ message: "Revise nome, descrição, duração e valor do serviço." }, 400);
    const db = await getDb();
    const [service] = await db.insert(services).values({ id: crypto.randomUUID(), categoryId: input.categoryId, name: input.name, description: input.description, durationMinutes: input.durationMinutes, priceType: input.priceType, priceCents: input.priceCents, active: input.active }).returning();
    return noStore({ service }, 201);
  } catch {
    return noStore({ message: "Não foi possível criar o serviço." }, 500);
  }
}

export async function PATCH(request: Request) {
  try {
    if (!await requireAdmin(request)) return noStore({ message: "Acesso restrito ao painel administrativo." }, 403);
    const input = parseService(await request.json());
    if (!input?.id) return noStore({ message: "Revise os dados do serviço." }, 400);
    const db = await getDb();
    const [service] = await db.update(services).set({ categoryId: input.categoryId, name: input.name, description: input.description, durationMinutes: input.durationMinutes, priceType: input.priceType, priceCents: input.priceCents, active: input.active, updatedAt: new Date() }).where(eq(services.id, input.id)).returning();
    if (!service) return noStore({ message: "Serviço não encontrado." }, 404);
    return noStore({ service });
  } catch {
    return noStore({ message: "Não foi possível salvar o serviço." }, 500);
  }
}
