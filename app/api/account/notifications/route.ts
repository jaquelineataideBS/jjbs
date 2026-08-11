import { and, desc, eq, inArray, isNull, lte, or } from "drizzle-orm";
import { getDb } from "../../../../db";
import { notifications } from "../../../../db/schema";
import { getCurrentUser } from "../../../../lib/auth";

function noStore(data: Record<string, unknown>, status = 200) {
  return Response.json(data, { status, headers: { "Cache-Control": "no-store" } });
}

export async function GET(request: Request) {
  try {
    const user = await getCurrentUser(request);
    if (!user) return noStore({ message: "Faça login para consultar suas notificações." }, 401);
    const db = await getDb();
    const rows = await db.select({ id: notifications.id, title: notifications.title, message: notifications.message, type: notifications.type, status: notifications.status, scheduledFor: notifications.scheduledFor, sentAt: notifications.sentAt, readAt: notifications.readAt, createdAt: notifications.createdAt }).from(notifications).where(and(eq(notifications.userId, user.id), inArray(notifications.channel, ["in_app", "whatsapp_link"]), or(isNull(notifications.scheduledFor), lte(notifications.scheduledFor, new Date())))).orderBy(desc(notifications.createdAt)).limit(50);
    const unread = rows.filter((row) => !row.readAt).length;
    return noStore({ notifications: rows, unread });
  } catch {
    return noStore({ message: "Não foi possível carregar suas notificações." }, 500);
  }
}

export async function PATCH(request: Request) {
  try {
    const user = await getCurrentUser(request);
    if (!user) return noStore({ message: "Faça login novamente." }, 401);
    const body: unknown = await request.json();
    const ids = typeof body === "object" && body !== null && Array.isArray((body as { ids?: unknown }).ids) ? (body as { ids: unknown[] }).ids.filter((id): id is string => typeof id === "string").slice(0, 50) : [];
    if (!ids.length) return noStore({ message: "Selecione uma notificação." }, 400);
    const db = await getDb();
    await db.update(notifications).set({ status: "read", readAt: new Date(), updatedAt: new Date() }).where(and(eq(notifications.userId, user.id), inArray(notifications.id, ids)));
    return noStore({ message: "Notificações marcadas como lidas." });
  } catch {
    return noStore({ message: "Não foi possível atualizar as notificações." }, 500);
  }
}
