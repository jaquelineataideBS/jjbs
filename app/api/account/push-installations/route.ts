import { and, eq } from "drizzle-orm";
import { getDb } from "../../../../db";
import { clients, pushInstallations } from "../../../../db/schema";
import { getCurrentUser } from "../../../../lib/auth";
import { internalRoles } from "../../../../lib/permissions";

function noStore(data: Record<string, unknown>, status = 200) {
  return Response.json(data, { status, headers: { "Cache-Control": "no-store" } });
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

export async function GET(request: Request) {
  const user = await getCurrentUser(request);
  if (!user) return noStore({ message: "Entre na sua conta para configurar notificações." }, 401);
  try {
    const db = await getDb();
    const [client] = user.role === "client"
      ? await db.select({ marketingConsent: clients.marketingConsent }).from(clients).where(eq(clients.userId, user.id)).limit(1)
      : [];
    return noStore({
      ready: Boolean(process.env.NEXT_PUBLIC_FIREBASE_VAPID_KEY && process.env.FIREBASE_SERVICE_ACCOUNT_JSON),
      marketingConsent: client?.marketingConsent ?? false,
    });
  } catch {
    return noStore({ message: "Não foi possível carregar as preferências de notificações." }, 500);
  }
}

export async function PATCH(request: Request) {
  const user = await getCurrentUser(request);
  if (!user) return noStore({ message: "Entre na sua conta para configurar promoções." }, 401);
  if (user.role !== "client") return noStore({ message: "Esta preferência é exclusiva da conta da cliente." }, 403);
  try {
    const body: unknown = await request.json();
    if (!isRecord(body) || typeof body.marketingConsent !== "boolean") return noStore({ message: "Revise a preferência de promoções." }, 400);
    const db = await getDb();
    const updated = await db.update(clients).set({ marketingConsent: body.marketingConsent, updatedAt: new Date() }).where(eq(clients.userId, user.id)).returning({ id: clients.id });
    if (!updated.length) return noStore({ message: "Sua conta ainda não está vinculada ao cadastro de clientes do studio." }, 409);
    return noStore({ marketingConsent: body.marketingConsent });
  } catch {
    return noStore({ message: "Não foi possível salvar sua preferência." }, 500);
  }
}

export async function POST(request: Request) {
  const user = await getCurrentUser(request);
  if (!user) return noStore({ message: "Entre na sua conta para ativar notificações." }, 401);
  try {
    const body: unknown = await request.json();
    const fid = isRecord(body) && typeof body.fid === "string" ? body.fid.trim() : "";
    if (fid.length < 8 || fid.length > 256) return noStore({ message: "O identificador do dispositivo é inválido." }, 400);
    if (user.role !== "client" && !internalRoles.includes(user.role as (typeof internalRoles)[number])) return noStore({ message: "Acesso restrito." }, 403);
    const db = await getDb();
    if (user.role === "client") {
      const [client] = await db.select({ marketingConsent: clients.marketingConsent }).from(clients).where(eq(clients.userId, user.id)).limit(1);
      if (!client?.marketingConsent) return noStore({ message: "Ative primeiro o consentimento para receber cupons e promoções." }, 409);
    }
    await db.insert(pushInstallations).values({ id: crypto.randomUUID(), userId: user.id, fid })
      .onConflictDoUpdate({ target: pushInstallations.fid, set: { userId: user.id, updatedAt: new Date() } });
    return noStore({ message: "Notificações ativadas neste dispositivo." }, 201);
  } catch {
    return noStore({ message: "Não foi possível ativar as notificações." }, 500);
  }
}

export async function DELETE(request: Request) {
  const user = await getCurrentUser(request);
  if (!user) return noStore({ message: "Entre na sua conta para desativar notificações." }, 401);
  try {
    const body: unknown = await request.json();
    const fid = isRecord(body) && typeof body.fid === "string" ? body.fid.trim() : "";
    if (fid.length < 8 || fid.length > 256) return noStore({ message: "O identificador do dispositivo é inválido." }, 400);
    const db = await getDb();
    await db.delete(pushInstallations).where(and(eq(pushInstallations.userId, user.id), eq(pushInstallations.fid, fid)));
    return noStore({ message: "Notificações desativadas neste dispositivo." });
  } catch {
    return noStore({ message: "Não foi possível desativar as notificações." }, 500);
  }
}
