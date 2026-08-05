import { eq } from "drizzle-orm";
import { getDb } from "../../../../db";
import { clients, users } from "../../../../db/schema";
import { createSession, hashPassword, sessionCookie } from "../../../../lib/auth";

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function json(data: Record<string, unknown>, status = 200, cookie?: string) {
  const headers = new Headers({ "Cache-Control": "no-store" });
  if (cookie) headers.set("Set-Cookie", cookie);
  return Response.json(data, { status, headers });
}

export async function POST(request: Request) {
  let body: Record<string, unknown>;
  try {
    const value: unknown = await request.json();
    if (!isRecord(value)) return json({ message: "Revise os dados informados." }, 400);
    body = value;
  } catch {
    return json({ message: "Não foi possível ler os dados do cadastro." }, 400);
  }

  const name = typeof body.name === "string" ? body.name.trim() : "";
  const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
  const phone = typeof body.phone === "string" ? body.phone.trim() : "";
  const password = typeof body.password === "string" ? body.password : "";

  if (name.length < 2 || name.length > 120 || !/^\S+@\S+\.\S+$/.test(email) || email.length > 160 || phone.replace(/\D/g, "").length < 8 || password.length < 8 || password.length > 128) {
    return json({ message: "Informe nome, e-mail, telefone e uma senha com pelo menos 8 caracteres." }, 400);
  }

  try {
    const db = await getDb();
    const [existing] = await db.select({ id: users.id }).from(users).where(eq(users.email, email)).limit(1);
    if (existing) return json({ message: "Já existe uma conta com este e-mail." }, 409);

    const userId = crypto.randomUUID();
    await db.batch([
      db.insert(users).values({ id: userId, name, email, phone, passwordHash: await hashPassword(password), role: "client", status: "active" }),
      db.insert(clients).values({ id: crypto.randomUUID(), userId, name, phone, email }),
    ]);

    const session = await createSession(db, userId);
    return json({ user: { id: userId, name, email, phone, role: "client" } }, 201, sessionCookie(session.token, request, session.expiresAt));
  } catch (error) {
    const message = error instanceof Error ? error.message : "";
    if (message.includes("cloudflare:") || message.includes("D1 binding") || message.includes("ERR_UNSUPPORTED_ESM_URL_SCHEME")) return json({ message: "O banco de dados ainda não está conectado neste ambiente." }, 503);
    return json({ message: "Não foi possível criar sua conta agora. Tente novamente em instantes." }, 500);
  }
}
