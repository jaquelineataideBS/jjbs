import { and, asc, eq, notInArray } from "drizzle-orm";
import { getDb } from "../../../db";
import { appointments, blockedTimes, businessHours, openScheduleDates, professionalServices, professionals, services } from "../../../db/schema";
import { buildAvailableSlots, todayInFortaleza, weekdayForDate } from "../../../lib/scheduling";

const cancelledStatuses = ["cancelled_by_client", "cancelled_by_salon"];

function noStore(data: Record<string, unknown>, status = 200) {
  return Response.json(data, { status, headers: { "Cache-Control": "no-store" } });
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const serviceId = url.searchParams.get("serviceId")?.trim() ?? "";
  const appointmentDate = url.searchParams.get("date")?.trim() ?? "";
  const professionalId = url.searchParams.get("professionalId")?.trim() ?? "";

  if (!serviceId && !appointmentDate) return noStore({ message: "Escolha uma data para ver os horários disponíveis." }, 400);
  if (appointmentDate && (!/^\d{4}-\d{2}-\d{2}$/.test(appointmentDate) || appointmentDate < todayInFortaleza())) {
    return noStore({ message: "Escolha uma data válida para o agendamento." }, 400);
  }

  try {
    const db = await getDb();
    if (!serviceId) {
      const [eligiblePairs, openDates, hours, blockRows, appointmentRows] = await Promise.all([
        db.select({ professionalId: professionals.id, durationMinutes: services.durationMinutes })
          .from(professionalServices)
          .innerJoin(professionals, eq(professionals.id, professionalServices.professionalId))
          .innerJoin(services, eq(services.id, professionalServices.serviceId))
          .where(and(eq(professionals.active, true), eq(services.active, true))),
        db.select({ professionalId: openScheduleDates.professionalId })
          .from(openScheduleDates)
          .where(eq(openScheduleDates.date, appointmentDate)),
        db.select({ professionalId: businessHours.professionalId, startTime: businessHours.startTime, endTime: businessHours.endTime, breakStart: businessHours.breakStart, breakEnd: businessHours.breakEnd })
          .from(businessHours)
          .innerJoin(professionals, eq(professionals.id, businessHours.professionalId))
          .where(and(eq(businessHours.weekday, weekdayForDate(appointmentDate)), eq(businessHours.active, true), eq(professionals.active, true))),
        db.select({ professionalId: blockedTimes.professionalId, startTime: blockedTimes.startTime, endTime: blockedTimes.endTime })
          .from(blockedTimes)
          .where(eq(blockedTimes.blockDate, appointmentDate)),
        db.select({ professionalId: appointments.professionalId, startTime: appointments.startTime, endTime: appointments.endTime })
          .from(appointments)
          .where(and(eq(appointments.appointmentDate, appointmentDate), notInArray(appointments.status, cancelledStatuses))),
      ]);

      const openProfessionalIds = new Set(openDates.map((row) => row.professionalId));
      const slots = new Set<string>();
      for (const pair of eligiblePairs) {
        if (pair.durationMinutes <= 0 || !openProfessionalIds.has(pair.professionalId)) continue;
        const unavailable = [
          ...blockRows.filter((row) => row.professionalId === pair.professionalId),
          ...appointmentRows.filter((row) => row.professionalId === pair.professionalId),
        ];
        for (const period of hours.filter((row) => row.professionalId === pair.professionalId)) {
          for (const slot of buildAvailableSlots(period, pair.durationMinutes, unavailable)) slots.add(slot);
        }
      }
      return noStore({ professionals: [], slots: [...slots].sort() });
    }

    const [service] = await db.select({ id: services.id, durationMinutes: services.durationMinutes })
      .from(services).where(and(eq(services.id, serviceId), eq(services.active, true))).limit(1);
    if (!service) return noStore({ message: "Este serviço não está disponível para agendamento." }, 404);

    const availableProfessionals = await db.select({ id: professionals.id, name: professionals.name, title: professionals.title })
      .from(professionalServices)
      .innerJoin(professionals, eq(professionals.id, professionalServices.professionalId))
      .where(and(eq(professionalServices.serviceId, service.id), eq(professionals.active, true)))
      .orderBy(asc(professionals.displayOrder), asc(professionals.name));

    if (!professionalId || !appointmentDate) return noStore({ professionals: availableProfessionals, slots: [] });
    if (!availableProfessionals.some((professional) => professional.id === professionalId)) {
      return noStore({ message: "Esta profissional não atende o serviço selecionado." }, 400);
    }

    const [openDate] = await db.select({ id: openScheduleDates.id }).from(openScheduleDates).where(and(eq(openScheduleDates.professionalId, professionalId), eq(openScheduleDates.date, appointmentDate))).limit(1);
    if (!openDate) return noStore({ professionals: availableProfessionals, slots: [] });
    const hours = await db.select({ startTime: businessHours.startTime, endTime: businessHours.endTime, breakStart: businessHours.breakStart, breakEnd: businessHours.breakEnd })
      .from(businessHours)
      .where(and(eq(businessHours.professionalId, professionalId), eq(businessHours.weekday, weekdayForDate(appointmentDate)), eq(businessHours.active, true)))
      .orderBy(asc(businessHours.startTime));
    if (!hours.length) return noStore({ professionals: availableProfessionals, slots: [] });

    const [blockRows, appointmentRows] = await Promise.all([
      db.select({ startTime: blockedTimes.startTime, endTime: blockedTimes.endTime }).from(blockedTimes)
        .where(and(eq(blockedTimes.professionalId, professionalId), eq(blockedTimes.blockDate, appointmentDate))),
      db.select({ startTime: appointments.startTime, endTime: appointments.endTime }).from(appointments)
        .where(and(eq(appointments.professionalId, professionalId), eq(appointments.appointmentDate, appointmentDate), notInArray(appointments.status, cancelledStatuses))),
    ]);

    const unavailable = [...blockRows, ...appointmentRows];
    const slots = [...new Set(hours.flatMap((period) => buildAvailableSlots(period, service.durationMinutes, unavailable)))].sort();
    return noStore({ professionals: availableProfessionals, slots });
  } catch {
    return noStore({ message: "A agenda ainda não está configurada neste ambiente." }, 503);
  }
}
