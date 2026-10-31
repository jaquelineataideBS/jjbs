import { and, eq } from "drizzle-orm";
import { getDb } from "../../../../db";
import { appointmentServices, appointments, clients, notifications, services } from "../../../../db/schema";
import { requireAdmin } from "../../../../lib/admin";
import { sendAppointmentPush } from "../../../../lib/firebase-push";

const validStatuses = new Set(["pending_confirmation", "confirmed", "in_service", "completed", "cancelled_by_client", "cancelled_by_salon", "no_show", "rescheduled"]);

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

export async function PATCH(request: Request) {
  try {
    const admin = await requireAdmin(request);
    if (!admin) return Response.json({ message: "Acesso restrito ao painel administrativo." }, { status: 403, headers: { "Cache-Control": "no-store" } });
    const body: unknown = await request.json();
    if (!isRecord(body) || typeof body.id !== "string" || !validStatuses.has(String(body.status))) {
      return Response.json({ message: "Revise o status do agendamento." }, { status: 400, headers: { "Cache-Control": "no-store" } });
    }

    const db = await getDb();
    const [existing] = await db.select({
      id: appointments.id,
      status: appointments.status,
      appointmentDate: appointments.appointmentDate,
      startTime: appointments.startTime,
      clientUserId: clients.userId,
      serviceName: services.name,
    }).from(appointments)
      .innerJoin(clients, eq(clients.id, appointments.clientId))
      .leftJoin(appointmentServices, eq(appointmentServices.appointmentId, appointments.id))
      .leftJoin(services, eq(services.id, appointmentServices.serviceId))
      .where(eq(appointments.id, body.id))
      .limit(1);
    if (!existing) return Response.json({ message: "Agendamento não encontrado." }, { status: 404, headers: { "Cache-Control": "no-store" } });

    const nextStatus = String(body.status);
    const [updated] = await db.update(appointments)
      .set({ status: nextStatus, updatedAt: new Date() })
      .where(and(eq(appointments.id, existing.id), eq(appointments.status, existing.status)))
      .returning({ id: appointments.id, status: appointments.status });
    if (!updated) return Response.json({ message: "O agendamento foi atualizado em outro acesso. Recarregue a agenda." }, { status: 409, headers: { "Cache-Control": "no-store" } });

    if (nextStatus === "confirmed" && existing.status !== "confirmed" && existing.clientUserId) {
      const title = "Agendamento confirmado";
      const message = `Seu atendimento${existing.serviceName ? ` de ${existing.serviceName}` : ""} em ${existing.appointmentDate.split("-").reverse().join("/")}, às ${existing.startTime}, foi confirmado pelo studio.`;
      try {
        await db.insert(notifications).values({
          id: crypto.randomUUID(),
          userId: existing.clientUserId,
          appointmentId: existing.id,
          title,
          message,
          type: "confirmation",
          channel: "in_app",
          status: "sent",
          sentAt: new Date(),
          createdBy: admin.id,
        });
      } catch (error) {
        console.error("[notifications] appointment confirmation record failed", {
          message: error instanceof Error ? error.message : "Unknown notification error",
        });
      }
      await sendAppointmentPush([existing.clientUserId], {
        title,
        body: message,
        url: "/minha-conta#notificacoes",
      });
    }

    return Response.json({ appointment: updated }, { headers: { "Cache-Control": "no-store" } });
  } catch {
    return Response.json({ message: "Não foi possível atualizar o agendamento." }, { status: 500, headers: { "Cache-Control": "no-store" } });
  }
}
