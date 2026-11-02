import { and, eq, gte, lte, notInArray } from "drizzle-orm";
import { getDb } from "../db";
import { appointments, blockedTimes, businessHours, professionals, professionalServices, services } from "../db/schema";
import { buildAvailableSlots, todayInFortaleza, weekdayForDate } from "./scheduling";

export function upcomingDates(today: string, count = 14) {
  return Array.from({ length: count }, (_, offset) => {
    const date = new Date(`${today}T12:00:00Z`);
    date.setUTCDate(date.getUTCDate() + offset);
    return date.toISOString().slice(0, 10);
  });
}

export async function getPublicSchedule() {
  try {
    const today = todayInFortaleza();
    const dates = upcomingDates(today);
    const end = dates[dates.length - 1];
    const db = await getDb();
    const [hours, relations, blocks, bookings] = await Promise.all([
      db.select({ professionalId: businessHours.professionalId, weekday: businessHours.weekday, startTime: businessHours.startTime, endTime: businessHours.endTime, breakStart: businessHours.breakStart, breakEnd: businessHours.breakEnd })
        .from(businessHours).innerJoin(professionals, eq(professionals.id, businessHours.professionalId))
        .where(and(eq(businessHours.active, true), eq(professionals.active, true))),
      db.select({ professionalId: professionalServices.professionalId, duration: services.durationMinutes })
        .from(professionalServices).innerJoin(services, eq(services.id, professionalServices.serviceId)).where(eq(services.active, true)),
      db.select({ professionalId: blockedTimes.professionalId, date: blockedTimes.blockDate, startTime: blockedTimes.startTime, endTime: blockedTimes.endTime })
        .from(blockedTimes).where(and(gte(blockedTimes.blockDate, today), lte(blockedTimes.blockDate, end))),
      db.select({ professionalId: appointments.professionalId, date: appointments.appointmentDate, startTime: appointments.startTime, endTime: appointments.endTime })
        .from(appointments).where(and(gte(appointments.appointmentDate, today), lte(appointments.appointmentDate, end), notInArray(appointments.status, ["cancelled_by_client", "cancelled_by_salon"]))),
    ]);
    const now = new Intl.DateTimeFormat("en-GB", { timeZone: "America/Fortaleza", hour: "2-digit", minute: "2-digit", hour12: false }).format(new Date());
    const unavailable = [...blocks, ...bookings];
    return { days: dates.filter(date => hours.some(period => {
      if (period.weekday !== weekdayForDate(date)) return false;
      const durations = relations.filter(row => row.professionalId === period.professionalId && row.duration > 0).map(row => row.duration);
      if (!durations.length) return false;
      return buildAvailableSlots(period, Math.min(...durations), unavailable.filter(row => row.date === date && row.professionalId === period.professionalId))
        .some(slot => date !== today || slot > now);
    })), failed: false };
  } catch {
    return { days: [], failed: true };
  }
}
