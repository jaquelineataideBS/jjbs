import { desc, eq } from "drizzle-orm";
import { getDb } from "../../../db";
import { appointmentServices, appointments, clients, reviews, services } from "../../../db/schema";

export async function GET() {
  try {
    const db = await getDb();
    const rows = await db.select({ id: reviews.id, clientName: clients.name, serviceName: services.name, overallRating: reviews.overallRating, comment: reviews.comment, adminResponse: reviews.adminResponse, featured: reviews.featured, createdAt: reviews.createdAt }).from(reviews).innerJoin(clients, eq(clients.id, reviews.clientId)).innerJoin(appointments, eq(appointments.id, reviews.appointmentId)).leftJoin(appointmentServices, eq(appointmentServices.appointmentId, appointments.id)).leftJoin(services, eq(services.id, appointmentServices.serviceId)).where(eq(reviews.status, "approved")).orderBy(desc(reviews.featured), desc(reviews.createdAt)).limit(100);
    return Response.json({ reviews: rows }, { headers: { "Cache-Control": "public, max-age=60, stale-while-revalidate=300" } });
  } catch { return Response.json({ message: "Não foi possível carregar as avaliações." }, { status: 500 }); }
}
