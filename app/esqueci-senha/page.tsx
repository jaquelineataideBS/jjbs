"use client";

import { useState } from "react";
import Link from "next/link";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);
    setMessage("");
    try {
      const response = await fetch("/api/auth/forgot-password", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email }) });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(typeof result.message === "string" ? result.message : "Não foi possível iniciar a recuperação.");
      if (typeof result.nextPath !== "string") throw new Error("Não foi possível iniciar a recuperação.");
      window.location.assign(result.nextPath);
    } catch {
      setMessage("Não encontramos uma conta ativa com esse e-mail ou não foi possível continuar.");
    } finally {
      setSubmitting(false);
    }
  }

  return <main className="account-page"><header className="site-header"><Link className="brand" href="/" aria-label="Jaqueline Justino Beauty Studio - início"><span className="brand-symbol" aria-hidden="true"><img src="/jaqueline-justino-monogram.png?v=1" alt="" /></span><span className="brand-name"><strong>Jaqueline Justino</strong><small>Beauty Studio</small></span></Link><Link className="header-cta" href="/minha-conta">Voltar para entrar <span>↗</span></Link></header><section className="account-auth-shell password-recovery-shell"><div className="account-auth-intro"><p className="eyebrow">Acesso seguro <span>✦</span></p><h1>Vamos recuperar<br /><em>seu acesso.</em></h1><p>Informe o e-mail da sua conta. A redefinição acontece aqui mesmo, sem envio de mensagem.</p></div><div className="account-auth-card"><span className="account-card-label">Redefinir senha</span><h2>Qual é o seu e-mail?</h2><p className="account-helper">Depois de confirmar o e-mail, você poderá criar uma nova senha neste dispositivo.</p><form onSubmit={submit}><label>E-mail<input type="email" value={email} onChange={(event) => setEmail(event.target.value)} autoComplete="email" required maxLength={160} /></label><button className="button button-gold account-submit" type="submit" disabled={submitting}>{submitting ? "Continuando…" : "Continuar para redefinir"} <span>↗</span></button></form>{message && <p className="account-feedback error" role="alert">{message}</p>}<Link className="account-forgot-link recovery-back-link" href="/minha-conta">← Voltar para o login</Link></div></section></main>;
}
