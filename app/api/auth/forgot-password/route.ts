import { and, eq, gt, isNull } from "drizzle-orm";
import { getDb } from "../../../../db";
import { passwordResetTokens, users } from "../../../../db/schema";
import { createPasswordResetToken, hashToken } from "../../../../lib/auth";

const genericMessage = "Se existir uma conta com este e-mail, a próxima etapa estará disponível aqui.";

export async function POST(request: Request) {
  let email = "";
  try {
    const body: unknown = await request.json();
    if (typeof body === "object" && body !== null && "email" in body && typeof body.email === "string") {
      email = body.email.trim().toLowerCase();
    }
  } catch {
    return Response.json({ message: genericMessage }, { headers: { "Cache-Control": "no-store" } });
  }

  if (!/^\S+@\S+\.\S+$/.test(email) || email.length > 160) {
    return Response.json({ message: genericMessage }, { headers: { "Cache-Control": "no-store" } });
  }

  try {
    const db = await getDb();
    const [user] = await db.select({ id: users.id, email: users.email }).from(users)
      .where(and(eq(users.email, email), eq(users.status, "active"))).limit(1);
    if (!user) return Response.json({ message: genericMessage }, { status: 400, headers: { "Cache-Control": "no-store" } });

    const now = new Date();
    const token = createPasswordResetToken();
    const expiresAt = new Date(Date.now() + 30 * 60 * 1000);
    await db.update(passwordResetTokens).set({ usedAt: now }).where(and(eq(passwordResetTokens.userId, user.id), isNull(passwordResetTokens.usedAt), gt(passwordResetTokens.expiresAt, now)));
    await db.insert(passwordResetTokens).values({ id: crypto.randomUUID(), userId: user.id, tokenHash: await hashToken(token), expiresAt });

    return Response.json({ message: "Agora crie sua nova senha.", nextPath: `/redefinir-senha?token=${encodeURIComponent(token)}` }, { headers: { "Cache-Control": "no-store" } });
  } catch {
    // A resposta permanece genérica para não revelar contas ou detalhes internos.
  }

  return Response.json({ message: "Não foi possível iniciar a recuperação agora. Tente novamente." }, { status: 500, headers: { "Cache-Control": "no-store" } });
}
