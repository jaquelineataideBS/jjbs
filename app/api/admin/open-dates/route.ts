import { and, eq, gte, lte } from "drizzle-orm";
import { getDb } from "../../../../db";
import { openScheduleDates, professionalServices, professionals, services } from "../../../../db/schema";
import { requireAdmin } from "../../../../lib/admin";
import { todayInFortaleza } from "../../../../lib/scheduling";

function validDate(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(`${value}T12:00:00Z`);
  return Number.isFinite(date.getTime()) && date.toISOString().slice(0, 10) === value;
}
function respond(data: object, status = 200) { return Response.json(data, { status, headers: { "Cache-Control": "no-store" } }); }
export async function GET(request: Request) {
  if (!await requireAdmin(request)) return respond({ message: "Acesso restrito." }, 403);
  const url = new URL(request.url);
  const professionalId = url.searchParams.get("professionalId") ?? "";
  const month = url.searchParams.get("month") ?? "";
  if (!professionalId || !/^\d{4}-(0[1-9]|1[0-2])$/.test(month)) return respond({ message: "Selecione profissional e mês válidos." }, 400);
  try {
    const db = await getDb();
    const [serviceRows, rows] = await Promise.all([
      db.select({ id: services.id, name: services.name, professionalId: professionalServices.professionalId }).from(professionalServices)
        .innerJoin(services, eq(services.id, professionalServices.serviceId))
        .where(and(eq(professionalServices.professionalId, professionalId), eq(services.active, true))),
      db.select({ date: openScheduleDates.date, serviceIds: openScheduleDates.serviceIds }).from(openScheduleDates)
        .where(and(eq(openScheduleDates.professionalId, professionalId), gte(openScheduleDates.date, `${month}-01`), lte(openScheduleDates.date, `${month}-31`))),
    ]);
    const serviceIdsByProfessional = new Map<string, string[]>();
    for (const service of serviceRows) {
      const ids = serviceIdsByProfessional.get(service.professionalId) ?? [];
      ids.push(service.id);
      serviceIdsByProfessional.set(service.professionalId, ids);
    }
    return respond({
      services: serviceRows,
      // Older null rows meant every service for the professional was enabled.
      // Keep that meaning so dates saved before service-specific openings stay open.
      dates: rows.map(row => ({ date: row.date, serviceIds: row.serviceIds ?? serviceIdsByProfessional.get(professionalId) ?? [] })),
    });
  } catch { return respond({ message: "Não foi possível carregar as datas." }, 500); }
}
export async function POST(request: Request) {
  if (!await requireAdmin(request)) return respond({ message: "Acesso restrito." }, 403);
  try {
    const body: unknown = await request.json();
    if (!body || typeof body !== "object") return respond({ message: "Dados inválidos." }, 400);
    const { professionalId, date, open, serviceIds } = body as Record<string, unknown>;
    if (typeof professionalId !== "string" || !professionalId || typeof date !== "string" || !validDate(date) || date < todayInFortaleza() || typeof open !== "boolean") return respond({ message: "Selecione uma data válida." }, 400);
    const db = await getDb();
    const [professional] = await db.select({ id: professionals.id }).from(professionals).where(eq(professionals.id, professionalId)).limit(1);
    if (!professional) return respond({ message: "Profissional não encontrada." }, 404);
    if (open) {
      if (!Array.isArray(serviceIds) || serviceIds.length < 1 || serviceIds.length > 50 || serviceIds.some(id => typeof id !== "string" || !id)) {
        return respond({ message: "Escolha ao menos um serviço para este dia." }, 400);
      }
      const selectedIds = [...new Set(serviceIds as string[])];
      if (selectedIds.length !== serviceIds.length) return respond({ message: "Revise os serviços selecionados." }, 400);
      const allowedServices = await db.select({ id: services.id }).from(professionalServices)
        .innerJoin(services, eq(services.id, professionalServices.serviceId))
        .where(and(eq(professionalServices.professionalId, professionalId), eq(services.active, true)));
      const allowedIds = new Set(allowedServices.map(service => service.id));
      if (selectedIds.some(id => !allowedIds.has(id))) return respond({ message: "Um dos serviços não está ativo para esta profissional." }, 400);
      await db.insert(openScheduleDates).values({ id: crypto.randomUUID(), professionalId, date, serviceIds: selectedIds })
        .onConflictDoUpdate({
          target: [openScheduleDates.professionalId, openScheduleDates.date],
          set: { serviceIds: selectedIds },
        });
    } else {
      await db.insert(openScheduleDates).values({ id: crypto.randomUUID(), professionalId, date, serviceIds: [] })
        .onConflictDoUpdate({ target: [openScheduleDates.professionalId, openScheduleDates.date], set: { serviceIds: [] } });
    }
    return respond({ saved: true });
  } catch { return respond({ message: "Não foi possível salvar a data." }, 500); }
}
