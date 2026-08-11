import { and, asc, desc, eq, gte, inArray } from "drizzle-orm";
import { getDb } from "../../../../db";
import { appointmentServices, appointments, auditLogs, clients, notifications, reminderRules, services, users } from "../../../../db/schema";
import { requireAdmin } from "../../../../lib/admin";
import { todayInFortaleza } from "../../../../lib/scheduling";

const channels = new Set(["in_app", "whatsapp_link", "email"]);
const types = new Set(["confirmation", "reminder", "reschedule", "cancellation", "promotion", "birthday", "review_request", "maintenance", "custom"]);
function noStore(data: Record<string, unknown>, status = 200) { return Response.json(data, { status, headers: { "Cache-Control": "no-store" } }); }
function isRecord(value: unknown): value is Record<string, unknown> { return typeof value === "object" && value !== null; }

export async function GET(request: Request) {
  try {
    if (!(await requireAdmin(request))) return noStore({ message: "Acesso restrito ao painel administrativo." }, 403);
    const db = await getDb();
    const [rules, notificationRows, clientRows] = await Promise.all([
      db.select().from(reminderRules).orderBy(asc(reminderRules.hoursBefore)),
      db.select({ id: notifications.id, title: notifications.title, message: notifications.message, type: notifications.type, channel: notifications.channel, status: notifications.status, scheduledFor: notifications.scheduledFor, sentAt: notifications.sentAt, createdAt: notifications.createdAt, clientName: clients.name, phone: clients.whatsapp }).from(notifications).leftJoin(users, eq(users.id, notifications.userId)).leftJoin(clients, eq(clients.userId, users.id)).orderBy(desc(notifications.createdAt)).limit(300),
      db.select({ id: clients.id, userId: clients.userId, name: clients.name, phone: clients.whatsapp }).from(clients).where(eq(clients.active, true)).orderBy(asc(clients.name)).limit(500),
    ]);
    return noStore({ rules, notifications: notificationRows, clients: clientRows });
  } catch { return noStore({ message: "Não foi possível carregar a comunicação." }, 500); }
}

export async function POST(request: Request) {
  try {
    const admin = await requireAdmin(request);
    if (!admin) return noStore({ message: "Acesso restrito ao painel administrativo." }, 403);
    const body: unknown = await request.json();
    if (!isRecord(body)) return noStore({ message: "Dados inválidos." }, 400);
    const db = await getDb();
    if (body.resource === "rule") {
      const hoursBefore = Number(body.hoursBefore); const channel = typeof body.channel === "string" ? body.channel : "";
      if (!Number.isSafeInteger(hoursBefore) || hoursBefore < 1 || hoursBefore > 720 || !channels.has(channel)) return noStore({ message: "Revise o prazo e o canal do lembrete." }, 400);
      const id = crypto.randomUUID();
      const [rule] = await db.insert(reminderRules).values({ id, hoursBefore, channel, active: body.active !== false, createdBy: admin.id }).onConflictDoUpdate({ target: [reminderRules.hoursBefore, reminderRules.channel], set: { active: body.active !== false, updatedAt: new Date() } }).returning();
      await db.insert(auditLogs).values({ id: crypto.randomUUID(), userId: admin.id, action: "reminder_rule.saved", entity: "reminder_rule", entityId: rule.id, metadata: { hoursBefore, channel } });
      return noStore({ rule, message: "Regra de lembrete salva." }, 201);
    }
    if (body.resource === "generate") {
      const [rules, appointmentRows] = await Promise.all([
        db.select().from(reminderRules).where(eq(reminderRules.active, true)),
        db.select({ id: appointments.id, appointmentDate: appointments.appointmentDate, startTime: appointments.startTime, clientName: clients.name, userId: clients.userId }).from(appointments).innerJoin(clients, eq(clients.id, appointments.clientId)).where(and(gte(appointments.appointmentDate, todayInFortaleza()), inArray(appointments.status, ["pending_confirmation", "confirmed"]))).limit(500),
      ]);
      const appointmentIds = appointmentRows.map((item) => item.id);
      const serviceRows = appointmentIds.length ? await db.select({ appointmentId: appointmentServices.appointmentId, serviceName: services.name }).from(appointmentServices).innerJoin(services, eq(services.id, appointmentServices.serviceId)).where(inArray(appointmentServices.appointmentId, appointmentIds)) : [];
      const existing = appointmentIds.length ? await db.select({ appointmentId: notifications.appointmentId, type: notifications.type, channel: notifications.channel }).from(notifications).where(inArray(notifications.appointmentId, appointmentIds)) : [];
      let created = 0;
      for (const appointment of appointmentRows) {
        if (!appointment.userId) continue;
        for (const rule of rules) {
          const type = `reminder_${rule.hoursBefore}h`;
          if (existing.some((item) => item.appointmentId === appointment.id && item.type === type && item.channel === rule.channel)) continue;
          const scheduledFor = new Date(`${appointment.appointmentDate}T${appointment.startTime}:00-03:00`); scheduledFor.setHours(scheduledFor.getHours() - rule.hoursBefore);
          const serviceName = serviceRows.find((item) => item.appointmentId === appointment.id)?.serviceName ?? "seu atendimento";
          await db.insert(notifications).values({ id: crypto.randomUUID(), userId: appointment.userId, appointmentId: appointment.id, title: `Lembrete do seu horário`, message: `Olá, ${appointment.clientName}. Seu ${serviceName} está marcado para ${appointment.appointmentDate.split("-").reverse().join("/")}, às ${appointment.startTime}.`, type, channel: rule.channel, status: "pending", scheduledFor, createdBy: admin.id });
          created += 1;
        }
      }
      await db.insert(auditLogs).values({ id: crypto.randomUUID(), userId: admin.id, action: "reminders.generated", entity: "notification", entityId: crypto.randomUUID(), metadata: { created } });
      return noStore({ created, message: `${created} lembrete(s) preparado(s).` }, 201);
    }
    const userId = typeof body.userId === "string" ? body.userId : ""; const title = typeof body.title === "string" ? body.title.trim() : ""; const message = typeof body.message === "string" ? body.message.trim() : ""; const type = typeof body.type === "string" ? body.type : ""; const channel = typeof body.channel === "string" ? body.channel : "";
    if (!userId || title.length < 3 || title.length > 120 || message.length < 5 || message.length > 1000 || !types.has(type) || !channels.has(channel)) return noStore({ message: "Revise cliente, título, mensagem, tipo e canal." }, 400);
    const [client] = await db.select({ id: clients.id }).from(clients).where(and(eq(clients.userId, userId), eq(clients.active, true))).limit(1);
    if (!client) return noStore({ message: "A cliente precisa possuir conta ativa." }, 400);
    const id = crypto.randomUUID();
    const [notification] = await db.insert(notifications).values({ id, userId, title, message, type, channel, status: channel === "in_app" ? "sent" : "pending", sentAt: channel === "in_app" ? new Date() : null, createdBy: admin.id }).returning();
    await db.insert(auditLogs).values({ id: crypto.randomUUID(), userId: admin.id, action: "notification.created", entity: "notification", entityId: id, metadata: { type, channel, clientId: client.id } });
    return noStore({ notification, message: "Comunicação registrada." }, 201);
  } catch { return noStore({ message: "Não foi possível salvar a comunicação." }, 500); }
}

export async function PATCH(request: Request) {
  try {
    const admin = await requireAdmin(request); if (!admin) return noStore({ message: "Acesso restrito ao painel administrativo." }, 403);
    const body: unknown = await request.json(); if (!isRecord(body) || typeof body.id !== "string" || typeof body.active !== "boolean") return noStore({ message: "Revise a regra." }, 400);
    const db = await getDb(); const [rule] = await db.update(reminderRules).set({ active: body.active, updatedAt: new Date() }).where(eq(reminderRules.id, body.id)).returning(); if (!rule) return noStore({ message: "Regra não encontrada." }, 404);
    await db.insert(auditLogs).values({ id: crypto.randomUUID(), userId: admin.id, action: "reminder_rule.updated", entity: "reminder_rule", entityId: rule.id, metadata: { active: body.active } });
    return noStore({ rule, message: "Regra atualizada." });
  } catch { return noStore({ message: "Não foi possível atualizar a regra." }, 500); }
}
