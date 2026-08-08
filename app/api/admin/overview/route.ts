import { asc, desc, eq, gte } from "drizzle-orm";
import { getDb } from "../../../../db";
import { appointmentServices, appointments, clients, serviceCategories, services } from "../../../../db/schema";
import { requireAdmin } from "../../../../lib/admin";

const cancelledStatuses = ["cancelled_by_client", "cancelled_by_salon"];

function todayInFortaleza() {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "America/Fortaleza" }).format(new Date());
}

export async function GET(request: Request) {
  try {
    const admin = await requireAdmin(request);
    if (!admin) return Response.json({ message: "Acesso restrito ao painel administrativo." }, { status: 403, headers: { "Cache-Control": "no-store" } });

    const db = await getDb();
    const today = todayInFortaleza();
    const [agenda, clientRows, serviceRows, categoryRows] = await Promise.all([
      db.select({
        id: appointments.id,
        appointmentDate: appointments.appointmentDate,
        startTime: appointments.startTime,
        endTime: appointments.endTime,
        status: appointments.status,
        totalEstimatedCents: appointments.totalEstimatedCents,
        clientName: clients.name,
        clientPhone: clients.phone,
        serviceName: services.name,
      }).from(appointments)
        .innerJoin(clients, eq(clients.id, appointments.clientId))
        .leftJoin(appointmentServices, eq(appointmentServices.appointmentId, appointments.id))
        .leftJoin(services, eq(services.id, appointmentServices.serviceId))
        .where(gte(appointments.appointmentDate, today))
        .orderBy(asc(appointments.appointmentDate), asc(appointments.startTime))
        .limit(80),
      db.select({ id: clients.id, name: clients.name, phone: clients.phone, email: clients.email, createdAt: clients.createdAt })
        .from(clients).orderBy(desc(clients.createdAt)).limit(100),
      db.select({
        id: services.id,
        categoryId: services.categoryId,
        categoryName: serviceCategories.name,
        name: services.name,
        description: services.description,
        durationMinutes: services.durationMinutes,
        priceType: services.priceType,
        priceCents: services.priceCents,
        active: services.active,
      }).from(services)
        .leftJoin(serviceCategories, eq(serviceCategories.id, services.categoryId))
        .orderBy(asc(serviceCategories.displayOrder), asc(services.name)),
      db.select({ id: serviceCategories.id, name: serviceCategories.name, active: serviceCategories.active })
        .from(serviceCategories).where(eq(serviceCategories.active, true)).orderBy(asc(serviceCategories.displayOrder)),
    ]);

    const activeAgenda = agenda.filter((item) => !cancelledStatuses.includes(item.status));
    const todayAgenda = activeAgenda.filter((item) => item.appointmentDate === today);
    const pending = activeAgenda.filter((item) => item.status === "pending_confirmation");
    const estimatedCents = todayAgenda.reduce((total, item) => total + (item.totalEstimatedCents ?? 0), 0);

    return Response.json({
      admin: { name: admin.name },
      today,
      stats: { todayCount: todayAgenda.length, pendingCount: pending.length, clientsCount: clientRows.length, estimatedCents },
      appointments: agenda,
      clients: clientRows,
      services: serviceRows,
      categories: categoryRows,
    }, { headers: { "Cache-Control": "no-store" } });
  } catch {
    return Response.json({ message: "Não foi possível carregar o painel administrativo." }, { status: 500, headers: { "Cache-Control": "no-store" } });
  }
}
