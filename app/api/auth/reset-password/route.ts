import { and, eq, gt, isNull } from "drizzle-orm";
import { getDb } from "../../../../db";
import { passwordResetTokens, sessions, users } from "../../../../db/schema";
import { hashPassword, hashToken } from "../../../../lib/auth";

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

export async function POST(request: Request) {
  let body: Record<string, unknown>;
  try {
    const value: unknown = await request.json();
    if (!isRecord(value)) return Response.json({ message: "Link ou senha inválidos." }, { status: 400 });
    body = value;
  } catch {
    return Response.json({ message: "Link ou senha inválidos." }, { status: 400 });
  }

  const token = typeof body.token === "string" ? body.token : "";
  const password = typeof body.password === "string" ? body.password : "";
  if (token.length < 32 || password.length < 8 || password.length > 128) {
    return Response.json({ message: "Use uma senha com pelo menos 8 caracteres." }, { status: 400 });
  }

  try {
    const db = await getDb();
    const tokenHash = await hashToken(token);
    const [reset] = await db.select({ id: passwordResetTokens.id, userId: passwordResetTokens.userId })
      .from(passwordResetTokens)
      .where(and(eq(passwordResetTokens.tokenHash, tokenHash), isNull(passwordResetTokens.usedAt), gt(passwordResetTokens.expiresAt, new Date())))
      .limit(1);
    if (!reset) return Response.json({ message: "Este link é inválido ou expirou. Solicite um novo." }, { status: 400 });

    const [claimed] = await db.update(passwordResetTokens).set({ usedAt: new Date() })
      .where(and(eq(passwordResetTokens.id, reset.id), isNull(passwordResetTokens.usedAt)))
      .returning({ id: passwordResetTokens.id });
    if (!claimed) return Response.json({ message: "Este link já foi utilizado." }, { status: 400 });

    await db.batch([
      db.update(users).set({ passwordHash: await hashPassword(password), updatedAt: new Date() }).where(eq(users.id, reset.userId)),
      db.delete(sessions).where(eq(sessions.userId, reset.userId)),
    ]);

    return Response.json({ message: "Senha redefinida com sucesso. Entre com sua nova senha." }, { headers: { "Cache-Control": "no-store" } });
  } catch {
    return Response.json({ message: "Não foi possível redefinir sua senha agora." }, { status: 500 });
  }
}
