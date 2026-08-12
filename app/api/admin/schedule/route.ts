import { asc, eq, gte } from "drizzle-orm";
import { getDb } from "../../../../db";
import { blockedTimes, businessHours, professionalServices, professionals, services } from "../../../../db/schema";
import { hasOverlappingRanges, isClockTime, todayInFortaleza } from "../../../../lib/scheduling";
import { requireAdmin } from "../../../../lib/admin";
import { normalizeWhatsapp } from "../../../../lib/masks";

type HourInput = { weekday: number; startTime: string; endTime: string };

function noStore(data: Record<string, unknown>, status = 200) {
  return Response.json(data, { status, headers: { "Cache-Control": "no-store" } });
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function parseProfessional(value: unknown) {
  if (!isRecord(value)) return null;
  const id = typeof value.id === "string" ? value.id.trim() : "";
  const name = typeof value.name === "string" ? value.name.trim() : "";
  const title = typeof value.title === "string" ? value.title.trim() : "";
  const phoneInput = typeof value.phone === "string" ? value.phone.trim() : "";
  const phone = phoneInput ? normalizeWhatsapp(phoneInput) : null;
  const active = value.active !== false;
  const serviceIds = Array.isArray(value.serviceIds) ? value.serviceIds.filter((item): item is string => typeof item === "string" && item.length > 0) : [];
  if (!name || name.length > 120 || title.length > 120 || (phoneInput && !phone)) return null;
  return { id, name, title: title || null, phone, active, serviceIds: [...new Set(serviceIds)] };
}

function parseHours(value: unknown): HourInput[] | null {
  if (!Array.isArray(value) || value.length > 70) return null;
  const result: HourInput[] = [];
  for (const row of value) {
    if (!isRecord(row)) return null;
    const weekday = Number(row.weekday);
    const startTime = typeof row.startTime === "string" ? row.startTime : "";
    const endTime = typeof row.endTime === "string" ? row.endTime : "";
    if (!Number.isInteger(weekday) || weekday < 0 || weekday > 6 || !isClockTime(startTime) || !isClockTime(endTime) || startTime >= endTime) return null;
    result.push({ weekday, startTime, endTime });
  }
  for (const weekday of Array.from({ length: 7 }, (_, index) => index)) {
    if (hasOverlappingRanges(result.filter((item) => item.weekday === weekday))) return null;
  }
  return result;
}

function parseBlock(value: unknown) {
  if (!isRecord(value)) return null;
  const professionalId = typeof value.professionalId === "string" ? value.professionalId.trim() : "";
  const blockDate = typeof value.blockDate === "string" ? value.blockDate.trim() : "";
  const startTime = typeof value.startTime === "string" ? value.startTime : "";
  const endTime = typeof value.endTime === "string" ? value.endTime : "";
  const reason = typeof value.reason === "string" ? value.reason.trim() : "";
  if (!professionalId || !/^\d{4}-\d{2}-\d{2}$/.test(blockDate) || !isClockTime(startTime) || !isClockTime(endTime) || startTime >= endTime || reason.length > 240) return null;
  return { professionalId, blockDate, startTime, endTime, reason: reason || null };
}

export async function GET(request: Request) {
  try {
    if (!await requireAdmin(request)) return noStore({ message: "Acesso restrito ao painel administrativo." }, 403);
    const db = await getDb();
    const [professionalRows, serviceRows, hourRows, blockRows, relationRows] = await Promise.all([
      db.select().from(professionals).orderBy(asc(professionals.displayOrder), asc(professionals.name)),
      db.select({ id: services.id, name: services.name, active: services.active }).from(services).orderBy(asc(services.name)),
      db.select().from(businessHours).orderBy(asc(businessHours.professionalId), asc(businessHours.weekday)),
      db.select().from(blockedTimes).where(gte(blockedTimes.blockDate, todayInFortaleza())).orderBy(asc(blockedTimes.blockDate), asc(blockedTimes.startTime)),
      db.select({ professionalId: professionalServices.professionalId, serviceId: professionalServices.serviceId }).from(professionalServices),
    ]);
    return noStore({ professionals: professionalRows, services: serviceRows, hours: hourRows, blocks: blockRows, relations: relationRows });
  } catch {
    return noStore({ message: "Não foi possível carregar a configuração da agenda." }, 500);
  }
}

export async function POST(request: Request) {
  try {
    if (!await requireAdmin(request)) return noStore({ message: "Acesso restrito ao painel administrativo." }, 403);
    const body: unknown = await request.json();
    if (!isRecord(body) || typeof body.action !== "string") return noStore({ message: "Ação de agenda inválida." }, 400);
    const db = await getDb();

    if (body.action === "professional") {
      const input = parseProfessional(body);
      if (!input) return noStore({ message: "Revise os dados da profissional." }, 400);
      const id = crypto.randomUUID();
      const [professional] = await db.insert(professionals).values({ id, name: input.name, title: input.title, phone: input.phone, active: input.active, displayOrder: 99 }).returning();
      if (input.serviceIds.length) await db.insert(professionalServices).values(input.serviceIds.map((serviceId) => ({ id: crypto.randomUUID(), professionalId: id, serviceId }))).onConflictDoNothing();
      return noStore({ professional }, 201);
    }

    if (body.action === "hours") {
      const professionalId = typeof body.professionalId === "string" ? body.professionalId : "";
      const hours = parseHours(body.hours);
      if (!professionalId || !hours) return noStore({ message: "Revise os horários de funcionamento." }, 400);
      const [professional] = await db.select({ id: professionals.id }).from(professionals).where(eq(professionals.id, professionalId)).limit(1);
      if (!professional) return noStore({ message: "Profissional não encontrada." }, 404);
      const removeExisting = db.delete(businessHours).where(eq(businessHours.professionalId, professionalId));
      if (hours.length) {
        await db.batch([
          removeExisting,
          db.insert(businessHours).values(hours.map((hour) => ({
            id: crypto.randomUUID(),
            professionalId,
            weekday: hour.weekday,
            startTime: hour.startTime,
            endTime: hour.endTime,
            breakStart: null,
            breakEnd: null,
            active: true,
          }))),
        ]);
      } else {
        await removeExisting;
      }
      return noStore({ saved: true });
    }

    if (body.action === "block") {
      const input = parseBlock(body);
      if (!input) return noStore({ message: "Revise data, horário e motivo do bloqueio." }, 400);
      const [professional] = await db.select({ id: professionals.id }).from(professionals).where(eq(professionals.id, input.professionalId)).limit(1);
      if (!professional) return noStore({ message: "Profissional não encontrada." }, 404);
      const [block] = await db.insert(blockedTimes).values({ id: crypto.randomUUID(), ...input }).returning();
      return noStore({ block }, 201);
    }

    return noStore({ message: "Ação de agenda inválida." }, 400);
  } catch {
    return noStore({ message: "Não foi possível salvar a configuração da agenda." }, 500);
  }
}

export async function PATCH(request: Request) {
  try {
    if (!await requireAdmin(request)) return noStore({ message: "Acesso restrito ao painel administrativo." }, 403);
    const input = parseProfessional(await request.json());
    if (!input?.id) return noStore({ message: "Revise os dados da profissional." }, 400);
    const db = await getDb();
    const [professional] = await db.update(professionals).set({ name: input.name, title: input.title, phone: input.phone, active: input.active, updatedAt: new Date() }).where(eq(professionals.id, input.id)).returning();
    if (!professional) return noStore({ message: "Profissional não encontrada." }, 404);
    await db.delete(professionalServices).where(eq(professionalServices.professionalId, input.id));
    if (input.serviceIds.length) await db.insert(professionalServices).values(input.serviceIds.map((serviceId) => ({ id: crypto.randomUUID(), professionalId: input.id, serviceId }))).onConflictDoNothing();
    return noStore({ professional });
  } catch {
    return noStore({ message: "Não foi possível atualizar a profissional." }, 500);
  }
}

export async function DELETE(request: Request) {
  try {
    if (!await requireAdmin(request)) return noStore({ message: "Acesso restrito ao painel administrativo." }, 403);
    const body: unknown = await request.json();
    const id = isRecord(body) && typeof body.id === "string" ? body.id : "";
    if (!id) return noStore({ message: "Bloqueio inválido." }, 400);
    const db = await getDb();
    const removed = await db.delete(blockedTimes).where(eq(blockedTimes.id, id)).returning({ id: blockedTimes.id });
    if (!removed[0]) return noStore({ message: "Bloqueio não encontrado." }, 404);
    return noStore({ removed: true });
  } catch {
    return noStore({ message: "Não foi possível remover o bloqueio." }, 500);
  }
}
