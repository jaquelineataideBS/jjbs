type ResetEmailResult = { delivered: boolean };

export async function sendPasswordResetEmail(email: string, resetUrl: string): Promise<ResetEmailResult> {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.PASSWORD_RESET_FROM_EMAIL;
  if (!apiKey || !from) return { delivered: false };

  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from,
      to: [email],
      subject: "Redefina sua senha — Jaqueline Beauty Studio",
      html: `<div style="background:#0b0b0b;color:#f6f0e5;font-family:Arial,sans-serif;padding:32px"><h1 style="color:#c6a66a">Redefinição de senha</h1><p>Recebemos um pedido para redefinir sua senha.</p><p><a href="${resetUrl}" style="background:#c6a66a;color:#17120b;display:inline-block;padding:14px 22px;text-decoration:none">Criar nova senha</a></p><p style="color:#a69d91">Este link expira em 30 minutos. Se você não fez o pedido, ignore esta mensagem.</p></div>`,
    }),
  });

  return { delivered: response.ok };
}
