import { asc, eq } from "drizzle-orm";
import { getDb } from "../../../../db";
import { clients } from "../../../../db/schema";
import { requirePermission } from "../../../../lib/admin";

export async function GET(request: Request) {
  try {
    if (!(await requirePermission(request, "clients"))) {
      return Response.json({ message: "Acesso restrito ao painel administrativo." }, { status: 403, headers: { "Cache-Control": "no-store" } });
    }
    const db = await getDb();
    const clientRows = await db.select({
      id: clients.id,
      name: clients.name,
      phone: clients.phone,
      whatsapp: clients.whatsapp,
      email: clients.email,
      notes: clients.notes,
    }).from(clients).where(eq(clients.active, true)).orderBy(asc(clients.name)).limit(500);
    return Response.json({ clients: clientRows }, { headers: { "Cache-Control": "no-store" } });
  } catch {
    return Response.json({ message: "Não foi possível carregar os clientes cadastrados." }, { status: 500, headers: { "Cache-Control": "no-store" } });
  }
}
