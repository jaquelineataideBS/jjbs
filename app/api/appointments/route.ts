import { and, eq, gt, lt, notInArray } from "drizzle-orm";
import { getDb } from "../../../db";
import { appointmentServices, appointments, clients, services } from "../../../db/schema";

const blockedStatuses = ["cancelled_by_client", "cancelled_by_salon"];

type BookingPayload = {
  serviceId: string;
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
  const appointmentDate = typeof value.appointmentDate === "string" ? value.appointmentDate.trim() : "";
  const startTime = typeof value.startTime === "string" ? value.startTime.trim() : "";
  const clientName = typeof value.client.name === "string" ? value.client.name.trim() : "";
  const phone = typeof value.client.phone === "string" ? value.client.phone.trim() : "";
  const email = typeof value.client.email === "string" ? value.client.email.trim() : "";
  const notes = typeof value.client.notes === "string" ? value.client.notes.trim() : "";

  if (!serviceId || !/^\d{4}-\d{2}-\d{2}$/.test(appointmentDate) || !/^\d{2}:\d{2}$/.test(startTime)) return null;
  if (clientName.length < 2 || clientName.length > 120 || phone.replace(/\D/g, "").length < 8 || phone.length > 30) return null;
  if (email && (email.length > 160 || !/^\S+@\S+\.\S+$/.test(email))) return null;
  if (notes.length > 500) return null;

  return {
    serviceId,
    appointmentDate,
    startTime,
    client: { name: clientName, phone, email: email || undefined, notes: notes || undefined },
  };
}

function addMinutes(startTime: string, durationMinutes: number) {
  const [hours, minutes] = startTime.split(":").map(Number);
  const totalMinutes = hours * 60 + minutes + durationMinutes;
  const endHours = Math.floor(totalMinutes / 60);
  const endMinutes = totalMinutes % 60;
  return `${String(endHours).padStart(2, "0")}:${String(endMinutes).padStart(2, "0")}`;
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

  try {
    const db = await getDb();
    const [service] = await db.select().from(services).where(and(eq(services.id, payload.serviceId), eq(services.active, true))).limit(1);

    if (!service) {
      return json({ message: "Este serviço não está disponível para agendamento." }, 400);
    }

    const endTime = addMinutes(payload.startTime, service.durationMinutes);
    if (endTime > "20:00") {
      return json({ message: "O horário escolhido ultrapassa o funcionamento do studio." }, 400);
    }

    const conflictRows = await db.select({ id: appointments.id }).from(appointments).where(and(
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
