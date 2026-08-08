import { eq } from "drizzle-orm";
import { getDb } from "../../../../db";
import { appointments } from "../../../../db/schema";
import { requireAdmin } from "../../../../lib/admin";

const validStatuses = new Set(["pending_confirmation", "confirmed", "in_service", "completed", "cancelled_by_client", "cancelled_by_salon", "no_show", "rescheduled"]);

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

export async function PATCH(request: Request) {
  try {
    if (!await requireAdmin(request)) return Response.json({ message: "Acesso restrito ao painel administrativo." }, { status: 403, headers: { "Cache-Control": "no-store" } });
    const body: unknown = await request.json();
    if (!isRecord(body) || typeof body.id !== "string" || !validStatuses.has(String(body.status))) {
      return Response.json({ message: "Revise o status do agendamento." }, { status: 400, headers: { "Cache-Control": "no-store" } });
    }

    const db = await getDb();
    const result = await db.update(appointments).set({ status: String(body.status), updatedAt: new Date() }).where(eq(appointments.id, body.id)).returning({ id: appointments.id, status: appointments.status });
    if (!result[0]) return Response.json({ message: "Agendamento não encontrado." }, { status: 404, headers: { "Cache-Control": "no-store" } });
    return Response.json({ appointment: result[0] }, { headers: { "Cache-Control": "no-store" } });
  } catch {
    return Response.json({ message: "Não foi possível atualizar o agendamento." }, { status: 500, headers: { "Cache-Control": "no-store" } });
  }
}
