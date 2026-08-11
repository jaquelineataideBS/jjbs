import { and, eq, gt, isNull } from "drizzle-orm";
import { getDb } from "../../../../db";
import { passwordResetTokens, users } from "../../../../db/schema";
import { createPasswordResetToken, hashToken } from "../../../../lib/auth";
import { isPasswordResetEmailConfigured, sendPasswordResetEmail } from "../../../../lib/password-reset-email";

const genericMessage = "Se existir uma conta com este e-mail, enviaremos um link de redefinição.";
const unavailableMessage = "O envio de recuperação por e-mail ainda não está configurado. Fale com o studio para recuperar seu acesso.";

export async function POST(request: Request) {
  if (!isPasswordResetEmailConfigured()) {
    return Response.json({ message: unavailableMessage }, { status: 503, headers: { "Cache-Control": "no-store" } });
  }

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
    if (!user) return Response.json({ message: genericMessage }, { headers: { "Cache-Control": "no-store" } });

    const now = new Date();
    const active = await db.select({ id: passwordResetTokens.id }).from(passwordResetTokens)
      .where(and(eq(passwordResetTokens.userId, user.id), isNull(passwordResetTokens.usedAt), gt(passwordResetTokens.expiresAt, now))).limit(1);
    if (active.length) return Response.json({ message: genericMessage }, { headers: { "Cache-Control": "no-store" } });

    const token = createPasswordResetToken();
    const expiresAt = new Date(Date.now() + 30 * 60 * 1000);
    const resetId = crypto.randomUUID();
    const tokenHash = await hashToken(token);
    await db.insert(passwordResetTokens).values({ id: resetId, userId: user.id, tokenHash, expiresAt });

    const configuredSiteUrl = process.env.NEXT_PUBLIC_SITE_URL?.trim();
    const origin = new URL(configuredSiteUrl || request.url).origin;
    const delivery = await sendPasswordResetEmail(
      user.email,
      `${origin}/redefinir-senha?token=${encodeURIComponent(token)}`,
      `password-reset-${resetId}`,
    );
    if (!delivery.delivered) {
      await db.update(passwordResetTokens).set({ usedAt: new Date() }).where(eq(passwordResetTokens.tokenHash, tokenHash));
    }
  } catch {
    // A resposta permanece genérica para não revelar contas ou detalhes internos.
  }

  return Response.json({ message: genericMessage }, { headers: { "Cache-Control": "no-store" } });
}
