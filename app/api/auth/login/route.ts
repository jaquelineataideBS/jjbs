import { eq } from "drizzle-orm";
import { getDb } from "../../../../db";
import { createSession, sessionCookie, verifyPassword } from "../../../../lib/auth";
import { users } from "../../../../db/schema";

function json(data: Record<string, unknown>, status = 200, cookie?: string) {
  const headers = new Headers({ "Cache-Control": "no-store" });
  if (cookie) headers.set("Set-Cookie", cookie);
  return Response.json(data, { status, headers });
}

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return json({ message: "Não foi possível ler os dados de acesso." }, 400);
  }

  if (typeof body !== "object" || body === null) return json({ message: "Informe e-mail e senha." }, 400);
  const values = body as Record<string, unknown>;
  const email = typeof values.email === "string" ? values.email.trim().toLowerCase() : "";
  const password = typeof values.password === "string" ? values.password : "";
  if (!email || !password) return json({ message: "Informe e-mail e senha." }, 400);

  try {
    const db = await getDb();
    const [user] = await db.select().from(users).where(eq(users.email, email)).limit(1);
    if (!user || user.status !== "active" || !(await verifyPassword(password, user.passwordHash))) return json({ message: "E-mail ou senha inválidos." }, 401);

    const session = await createSession(db, user.id);
    return json({ user: { id: user.id, name: user.name, email: user.email, phone: user.phone, role: user.role } }, 200, sessionCookie(session.token, request, session.expiresAt));
  } catch (error) {
    const message = error instanceof Error ? error.message : "";
    if (message.includes("cloudflare:") || message.includes("D1 binding") || message.includes("ERR_UNSUPPORTED_ESM_URL_SCHEME")) return json({ message: "O banco de dados ainda não está conectado neste ambiente." }, 503);
    return json({ message: "Não foi possível acessar sua conta agora. Tente novamente em instantes." }, 500);
  }
}
