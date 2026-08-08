import { and, eq, gt, lt, notInArray } from "drizzle-orm";
import { getDb } from "../../../db";
import { appointmentServices, appointments, blockedTimes, businessHours, clients, professionalServices, professionals, services } from "../../../db/schema";
import { addMinutes, isClockTime, rangesOverlap, todayInFortaleza, weekdayForDate } from "../../../lib/scheduling";

const blockedStatuses = ["cancelled_by_client", "cancelled_by_salon"];

type BookingPayload = {
  serviceId: string;
  professionalId: string;
  appointmentDate: string;
  startTime: string;
  client: {
    name: string;
    phone: string;
    email?: string;
    notes?: string;
  };
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function parsePayload(value: unknown): BookingPayload | null {
  if (!isRecord(value) || !isRecord(value.client)) return null;

  const serviceId = typeof value.serviceId === "string" ? value.serviceId.trim() : "";
  const professionalId = typeof value.professionalId === "string" ? value.professionalId.trim() : "";
  const appointmentDate = typeof value.appointmentDate === "string" ? value.appointmentDate.trim() : "";
  const startTime = typeof value.startTime === "string" ? value.startTime.trim() : "";
  const clientName = typeof value.client.name === "string" ? value.client.name.trim() : "";
  const phone = typeof value.client.phone === "string" ? value.client.phone.trim() : "";
  const email = typeof value.client.email === "string" ? value.client.email.trim() : "";
  const notes = typeof value.client.notes === "string" ? value.client.notes.trim() : "";

  if (!serviceId || !professionalId || !/^\d{4}-\d{2}-\d{2}$/.test(appointmentDate) || !isClockTime(startTime)) return null;
  if (clientName.length < 2 || clientName.length > 120 || phone.replace(/\D/g, "").length < 8 || phone.length > 30) return null;
  if (email && (email.length > 160 || !/^\S+@\S+\.\S+$/.test(email))) return null;
  if (notes.length > 500) return null;

  return {
    serviceId,
    professionalId,
    appointmentDate,
    startTime,
    client: { name: clientName, phone, email: email || undefined, notes: notes || undefined },
  };
}

function json(data: Record<string, unknown>, status = 200) {
  return Response.json(data, { status, headers: { "Cache-Control": "no-store" } });
}

export async function POST(request: Request) {
  let payload: BookingPayload | null;

  try {
    payload = parsePayload(await request.json());
  } catch {
    return json({ message: "Não foi possível ler os dados do agendamento." }, 400);
  }

  if (!payload) {
    return json({ message: "Revise os dados obrigatórios do agendamento." }, 400);
  }
  if (payload.appointmentDate < todayInFortaleza()) return json({ message: "Escolha uma data futura para o agendamento." }, 400);

  try {
    const db = await getDb();
    const [service] = await db.select().from(services).where(and(eq(services.id, payload.serviceId), eq(services.active, true))).limit(1);

    if (!service) {
      return json({ message: "Este serviço não está disponível para agendamento." }, 400);
    }

    const [professional] = await db.select({ id: professionals.id }).from(professionals)
      .innerJoin(professionalServices, eq(professionalServices.professionalId, professionals.id))
      .where(and(eq(professionals.id, payload.professionalId), eq(professionals.active, true), eq(professionalServices.serviceId, service.id)))
      .limit(1);
    if (!professional) return json({ message: "A profissional escolhida não atende este serviço." }, 400);

    const endTime = addMinutes(payload.startTime, service.durationMinutes);
    const [hours] = await db.select({ startTime: businessHours.startTime, endTime: businessHours.endTime, breakStart: businessHours.breakStart, breakEnd: businessHours.breakEnd })
      .from(businessHours)
      .where(and(eq(businessHours.professionalId, professional.id), eq(businessHours.weekday, weekdayForDate(payload.appointmentDate)), eq(businessHours.active, true)))
      .limit(1);
    if (!hours || payload.startTime < hours.startTime || endTime > hours.endTime) return json({ message: "O horário escolhido está fora do expediente da profissional." }, 400);
    if (hours.breakStart && hours.breakEnd && rangesOverlap({ startTime: payload.startTime, endTime }, { startTime: hours.breakStart, endTime: hours.breakEnd })) {
      return json({ message: "O horário escolhido coincide com o intervalo da profissional." }, 400);
    }

    const blocked = await db.select({ id: blockedTimes.id }).from(blockedTimes).where(and(
      eq(blockedTimes.professionalId, professional.id), eq(blockedTimes.blockDate, payload.appointmentDate), lt(blockedTimes.startTime, endTime), gt(blockedTimes.endTime, payload.startTime),
    )).limit(1);
    if (blocked[0]) return json({ message: "Este horário foi bloqueado pelo studio. Escolha outra opção." }, 409);

    const conflictRows = await db.select({ id: appointments.id }).from(appointments).where(and(
      eq(appointments.professionalId, professional.id),
      eq(appointments.appointmentDate, payload.appointmentDate),
      notInArray(appointments.status, blockedStatuses),
      lt(appointments.startTime, endTime),
      gt(appointments.endTime, payload.startTime),
    )).limit(1);
    const conflict = conflictRows[0];

    if (conflict) {
      return json({ message: "Este horário acabou de ser reservado. Escolha outro horário disponível." }, 409);
    }

    const clientId = crypto.randomUUID();
    const appointmentId = crypto.randomUUID();
    const appointmentServiceId = crypto.randomUUID();

    await db.batch([
      db.insert(clients).values({
        id: clientId,
        name: payload.client.name,
        phone: payload.client.phone,
        email: payload.client.email,
        notes: payload.client.notes,
      }),
      db.insert(appointments).values({
        id: appointmentId,
        clientId,
        professionalId: professional.id,
        appointmentDate: payload.appointmentDate,
        startTime: payload.startTime,
        endTime,
        status: "pending_confirmation",
        totalEstimatedCents: service.priceCents,
        notesClient: payload.client.notes,
        source: "website",
      }),
      db.insert(appointmentServices).values({
        id: appointmentServiceId,
        appointmentId,
        serviceId: service.id,
        priceCents: service.priceCents,
        durationMinutes: service.durationMinutes,
      }),
    ]);

    return json({ appointmentId, status: "pending_confirmation" }, 201);
  } catch (error) {
    const message = error instanceof Error ? error.message : "";
    if (message.includes("D1 binding") || message.includes("DB") || message.includes("cloudflare:") || message.includes("ERR_UNSUPPORTED_ESM_URL_SCHEME")) {
      return json({ message: "O banco de dados ainda não está conectado neste ambiente. A solicitação não foi gravada." }, 503);
    }

    return json({ message: "Não foi possível registrar o agendamento agora. Tente novamente em instantes." }, 500);
  }
}
