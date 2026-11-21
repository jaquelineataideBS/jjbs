import { and, asc, eq, inArray, notInArray } from "drizzle-orm";
import { getDb } from "../../../db";
import { appointments, businessHours, openScheduleDates, professionalServices, professionals, services } from "../../../db/schema";
import { requireAdmin } from "../../../lib/admin";
import { buildConfiguredStartSlots, isClockTime, todayInFortaleza, weekdayForDate } from "../../../lib/scheduling";

const cancelledStatuses = ["cancelled_by_client", "cancelled_by_salon", "rescheduled"];

function noStore(data: Record<string, unknown>, status = 200) {
  return Response.json(data, { status, headers: { "Cache-Control": "no-store" } });
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const serviceId = url.searchParams.get("serviceId")?.trim() ?? "";
  const appointmentDate = url.searchParams.get("date")?.trim() ?? "";
  const professionalId = url.searchParams.get("professionalId")?.trim() ?? "";
  const requestedTime = url.searchParams.get("time")?.trim() ?? "";
  const excludeAppointmentId = url.searchParams.get("excludeAppointmentId")?.trim() ?? "";

  if (excludeAppointmentId && !(await requireAdmin(request))) return noStore({ message: "Acesso restrito." }, 403);

  if (!serviceId && !appointmentDate) return noStore({ message: "Escolha uma data para ver os horários disponíveis." }, 400);
  if (requestedTime && !isClockTime(requestedTime)) return noStore({ message: "Escolha um horário válido." }, 400);
  if (appointmentDate && (!/^\d{4}-\d{2}-\d{2}$/.test(appointmentDate) || appointmentDate < todayInFortaleza())) {
    return noStore({ message: "Escolha uma data válida para o agendamento." }, 400);
  }

  try {
    const db = await getDb();
    if (!serviceId) {
      const [eligiblePairs, openDates, hours, appointmentRows] = await Promise.all([
        db.select({ professionalId: professionals.id, serviceId: services.id, durationMinutes: services.durationMinutes })
          .from(professionalServices)
          .innerJoin(professionals, eq(professionals.id, professionalServices.professionalId))
          .innerJoin(services, eq(services.id, professionalServices.serviceId))
          .where(and(eq(professionals.active, true), eq(services.active, true))),
        db.select({ professionalId: openScheduleDates.professionalId, serviceIds: openScheduleDates.serviceIds })
          .from(openScheduleDates).innerJoin(professionals, eq(professionals.id, openScheduleDates.professionalId))
          .where(and(eq(openScheduleDates.date, appointmentDate), eq(professionals.active, true))),
        db.select({ professionalId: businessHours.professionalId, startTime: businessHours.startTime, endTime: businessHours.endTime, breakStart: businessHours.breakStart, breakEnd: businessHours.breakEnd })
          .from(businessHours)
          .innerJoin(professionals, eq(professionals.id, businessHours.professionalId))
          .where(and(eq(businessHours.weekday, weekdayForDate(appointmentDate)), eq(businessHours.active, true), eq(professionals.active, true))),
        db.select({ id: appointments.id, professionalId: appointments.professionalId, startTime: appointments.startTime, endTime: appointments.endTime })
          .from(appointments)
          .where(and(eq(appointments.appointmentDate, appointmentDate), notInArray(appointments.status, cancelledStatuses))),
      ]);

      const openDatesByProfessional = new Map(openDates.map(row => [row.professionalId, row.serviceIds]));
      const workingProfessionalIds = [...new Set(hours.map(row => row.professionalId))];
      const servicesBySlot = new Map<string, Set<string>>();
      for (const professionalId of workingProfessionalIds) {
        const hasDateOverride = openDatesByProfessional.has(professionalId);
        const openServiceIds = openDatesByProfessional.get(professionalId);
        const dateServices = hasDateOverride
          ? openServiceIds === null
            ? eligiblePairs.filter(pair => pair.professionalId === professionalId)
            : openServiceIds?.length
              ? eligiblePairs.filter(pair => pair.professionalId === professionalId && openServiceIds.includes(pair.serviceId))
              : []
          : [];
        const unavailable = appointmentRows.filter((row) => row.professionalId === professionalId && row.id !== excludeAppointmentId);
        const professionalHours = hours.filter((row) => row.professionalId === professionalId);
        for (const service of dateServices) {
          const serviceSlots = buildConfiguredStartSlots(professionalHours, service.durationMinutes, unavailable);
          for (const slot of serviceSlots) {
            const serviceIds = servicesBySlot.get(slot) ?? new Set<string>();
            serviceIds.add(service.serviceId);
            servicesBySlot.set(slot, serviceIds);
          }
        }
      }
      const serviceIdsBySlot = Object.fromEntries([...servicesBySlot].map(([slot, ids]) => [slot, [...ids]]));
      const serviceIds = [...new Set(Object.values(serviceIdsBySlot).flat())];
      return noStore({ professionals: [], slots: Object.keys(serviceIdsBySlot).sort(), serviceIds, serviceIdsBySlot });
    }

    const [service] = await db.select({ id: services.id, durationMinutes: services.durationMinutes })
      .from(services).where(and(eq(services.id, serviceId), eq(services.active, true))).limit(1);
    if (!service) return noStore({ message: "Este serviço não está disponível para agendamento." }, 404);

    const availableProfessionals = await db.select({ id: professionals.id, name: professionals.name, title: professionals.title })
      .from(professionalServices)
      .innerJoin(professionals, eq(professionals.id, professionalServices.professionalId))
      .where(and(eq(professionalServices.serviceId, service.id), eq(professionals.active, true)))
      .orderBy(asc(professionals.displayOrder), asc(professionals.name));

    let dateProfessionals = availableProfessionals;
    if (appointmentDate) {
      const openDates = await db.select({ id: professionals.id, name: professionals.name, title: professionals.title, serviceIds: openScheduleDates.serviceIds })
        .from(openScheduleDates).innerJoin(professionals, eq(professionals.id, openScheduleDates.professionalId))
        .where(and(eq(openScheduleDates.date, appointmentDate), eq(professionals.active, true)))
        .orderBy(asc(professionals.displayOrder), asc(professionals.name));
      const overrides = new Map(openDates.map(professional => [professional.id, professional.serviceIds]));
      dateProfessionals = availableProfessionals.filter(professional => {
        if (!overrides.has(professional.id)) return false;
        const serviceIds = overrides.get(professional.id);
        return serviceIds === null || Boolean(serviceIds?.includes(service.id));
      })
        .map(({ id, name, title }) => ({ id, name, title }));
    }

    if (!appointmentDate) return noStore({ professionals: dateProfessionals, slots: [] });
    const professionalIds = dateProfessionals.map((professional) => professional.id);
    if (!professionalIds.length) return noStore({ professionals: [], slots: [] });
    const [hours, appointmentRows] = await Promise.all([
      db.select({ professionalId: businessHours.professionalId, startTime: businessHours.startTime, endTime: businessHours.endTime, breakStart: businessHours.breakStart, breakEnd: businessHours.breakEnd })
        .from(businessHours)
        .where(and(inArray(businessHours.professionalId, professionalIds), eq(businessHours.weekday, weekdayForDate(appointmentDate)), eq(businessHours.active, true)))
        .orderBy(asc(businessHours.startTime)),
      db.select({ id: appointments.id, professionalId: appointments.professionalId, startTime: appointments.startTime, endTime: appointments.endTime }).from(appointments)
        .where(and(inArray(appointments.professionalId, professionalIds), eq(appointments.appointmentDate, appointmentDate), notInArray(appointments.status, cancelledStatuses))),
    ]);
    const slotsByProfessional = new Map<string, string[]>();
    for (const professional of dateProfessionals) {
      const unavailable = appointmentRows.filter((row) => row.professionalId === professional.id && row.id !== excludeAppointmentId);
      slotsByProfessional.set(
        professional.id,
        buildConfiguredStartSlots(hours.filter((row) => row.professionalId === professional.id), service.durationMinutes, unavailable),
      );
    }
    const timeProfessionals = requestedTime
      ? dateProfessionals.filter((professional) => slotsByProfessional.get(professional.id)?.includes(requestedTime))
      : dateProfessionals;
    const slots = professionalId ? slotsByProfessional.get(professionalId) ?? [] : [];
    return noStore({ professionals: timeProfessionals, slots });
  } catch {
    return noStore({ message: "A agenda ainda não está configurada neste ambiente." }, 503);
  }
}
