import { and, desc, eq, inArray } from "drizzle-orm";
import { getDb } from "../../../../db";
import { appointmentServices, appointments, clients, professionals, salonSettings, services } from "../../../../db/schema";
import { getCurrentUser } from "../../../../lib/auth";

const cancellableStatuses = ["pending_confirmation", "confirmed"];
const futureStatuses = new Set(["pending_confirmation", "confirmed", "in_service"]);

function noStore(data: Record<string, unknown>, status = 200) {
  return Response.json(data, { status, headers: { "Cache-Control": "no-store" } });
}

function nowInFortaleza() {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Fortaleza",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(new Date());
  const value = (type: Intl.DateTimeFormatPartTypes) => parts.find((part) => part.type === type)?.value ?? "";
  return { date: `${value("year")}-${value("month")}-${value("day")}`, time: `${value("hour")}:${value("minute")}` };
}

export async function GET(request: Request) {
  try {
    const user = await getCurrentUser(request);
    if (!user) return noStore({ message: "Entre na sua conta para consultar os agendamentos." }, 401);

    const db = await getDb();
    const [settings] = await db.select({ cancellationHours: salonSettings.cancellationHours, rescheduleAllowed: salonSettings.rescheduleAllowed }).from(salonSettings).where(eq(salonSettings.id, "studio")).limit(1);
    const cancellationHours = settings?.cancellationHours ?? 24;
    const rows = await db.select({
      id: appointments.id,
      appointmentDate: appointments.appointmentDate,
      startTime: appointments.startTime,
      endTime: appointments.endTime,
      status: appointments.status,
      totalEstimatedCents: appointments.totalEstimatedCents,
      serviceId: appointmentServices.serviceId,
      serviceName: services.name,
      professionalId: appointments.professionalId,
      professionalName: professionals.name,
    }).from(appointments)
      .innerJoin(clients, eq(clients.id, appointments.clientId))
      .leftJoin(appointmentServices, eq(appointmentServices.appointmentId, appointments.id))
      .leftJoin(services, eq(services.id, appointmentServices.serviceId))
      .leftJoin(professionals, eq(professionals.id, appointments.professionalId))
      .where(eq(clients.userId, user.id))
      .orderBy(desc(appointments.appointmentDate), desc(appointments.startTime))
      .limit(100);

    const now = nowInFortaleza();
    const normalized = rows.map((appointment) => ({
      ...appointment,
      isUpcoming: futureStatuses.has(appointment.status)
        && (appointment.appointmentDate > now.date || (appointment.appointmentDate === now.date && appointment.endTime > now.time)),
      canCancel: cancellableStatuses.includes(appointment.status)
        && new Date(`${appointment.appointmentDate}T${appointment.startTime}:00-03:00`).getTime() - Date.now() >= cancellationHours * 60 * 60 * 1000,
      canReschedule: settings?.rescheduleAllowed !== false && cancellableStatuses.includes(appointment.status)
        && new Date(`${appointment.appointmentDate}T${appointment.startTime}:00-03:00`).getTime() - Date.now() >= cancellationHours * 60 * 60 * 1000,
    }));

    return noStore({
      upcoming: normalized.filter((appointment) => appointment.isUpcoming).reverse(),
      history: normalized.filter((appointment) => !appointment.isUpcoming),
    });
  } catch {
    return noStore({ message: "Não foi possível carregar seus agendamentos agora." }, 500);
  }
}

export async function PATCH(request: Request) {
  try {
    const user = await getCurrentUser(request);
    if (!user) return noStore({ message: "Entre na sua conta para cancelar um agendamento." }, 401);

    const body: unknown = await request.json();
    if (typeof body !== "object" || body === null || !("id" in body) || typeof body.id !== "string") {
      return noStore({ message: "Agendamento inválido." }, 400);
    }

    const db = await getDb();
    const [settings] = await db.select({ cancellationHours: salonSettings.cancellationHours }).from(salonSettings).where(eq(salonSettings.id, "studio")).limit(1);
    const cancellationHours = settings?.cancellationHours ?? 24;
    const [ownedAppointment] = await db.select({
      id: appointments.id,
      appointmentDate: appointments.appointmentDate,
      startTime: appointments.startTime,
      status: appointments.status,
    }).from(appointments)
      .innerJoin(clients, eq(clients.id, appointments.clientId))
      .where(and(eq(appointments.id, body.id), eq(clients.userId, user.id)))
      .limit(1);

    if (!ownedAppointment) return noStore({ message: "Agendamento não encontrado." }, 404);
    const isFuture = new Date(`${ownedAppointment.appointmentDate}T${ownedAppointment.startTime}:00-03:00`).getTime() - Date.now() >= cancellationHours * 60 * 60 * 1000;
    if (!isFuture || !cancellableStatuses.includes(ownedAppointment.status)) {
      return noStore({ message: "Este agendamento não pode mais ser cancelado pela área da cliente." }, 409);
    }

    const result = await db.update(appointments)
      .set({ status: "cancelled_by_client", updatedAt: new Date() })
      .where(and(eq(appointments.id, ownedAppointment.id), inArray(appointments.status, cancellableStatuses)))
      .returning({ id: appointments.id, status: appointments.status });
    if (!result[0]) return noStore({ message: "O agendamento foi atualizado em outro acesso. Recarregue a página." }, 409);

    return noStore({ appointment: result[0], message: "Agendamento cancelado. O horário voltou a ficar disponível." });
  } catch {
    return noStore({ message: "Não foi possível cancelar o agendamento agora." }, 500);
  }
}
