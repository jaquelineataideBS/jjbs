import { and, eq, ne } from "drizzle-orm";
import { getDb } from "../../../../db";
import { clients, users } from "../../../../db/schema";
import { getCurrentUser } from "../../../../lib/auth";
import { normalizeWhatsapp } from "../../../../lib/masks";

function noStore(data: Record<string, unknown>, status = 200) {
  return Response.json(data, { status, headers: { "Cache-Control": "no-store" } });
}

export async function PATCH(request: Request) {
  try {
    const currentUser = await getCurrentUser(request);
    if (!currentUser) return noStore({ message: "Entre na sua conta para editar seus dados." }, 401);

    const body: unknown = await request.json();
    if (typeof body !== "object" || body === null) return noStore({ message: "Revise os dados informados." }, 400);
    const values = body as Record<string, unknown>;
    const name = typeof values.name === "string" ? values.name.trim() : "";
    const email = typeof values.email === "string" ? values.email.trim().toLowerCase() : "";
    const phone = normalizeWhatsapp(values.phone);

    if (name.length < 2 || name.length > 120 || !/^\S+@\S+\.\S+$/.test(email) || email.length > 160 || !phone) {
      return noStore({ message: "Informe nome, e-mail e WhatsApp válidos." }, 400);
    }

    const db = await getDb();
    const [emailOwner] = await db.select({ id: users.id }).from(users)
      .where(and(eq(users.email, email), ne(users.id, currentUser.id))).limit(1);
    if (emailOwner) return noStore({ message: "Este e-mail já está vinculado a outra conta." }, 409);

    await db.batch([
      db.update(users).set({ name, email, phone, updatedAt: new Date() }).where(eq(users.id, currentUser.id)),
      db.update(clients).set({ name, email, phone, whatsapp: phone, updatedAt: new Date() }).where(eq(clients.userId, currentUser.id)),
    ]);

    return noStore({ user: { ...currentUser, name, email, phone }, message: "Seus dados foram atualizados." });
  } catch {
    return noStore({ message: "Não foi possível atualizar seus dados agora." }, 500);
  }
}
