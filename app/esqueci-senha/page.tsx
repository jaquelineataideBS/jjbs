"use client";

import Link from "next/link";
import { PublicBrand, usePublicSettings } from "../public-settings";
import { whatsappHref } from "../../lib/public-links";

export default function ForgotPasswordPage() {
  const settings = usePublicSettings();

  return (
    <main className="account-page">
      <header className="site-header">
        <PublicBrand />
        <Link className="header-cta" href="/minha-conta">
          Voltar para entrar <span>↗</span>
        </Link>
      </header>
      <section className="account-auth-shell password-recovery-shell">
        <div className="account-auth-intro">
          <p className="eyebrow">
            Acesso seguro <span>✦</span>
          </p>
          <h1>
            Vamos recuperar
            <br />
            <em>seu acesso.</em>
          </h1>
          <p>
            Para proteger sua conta, o studio confirma sua identidade antes de
            liberar uma redefinição de senha.
          </p>
        </div>
        <div className="account-auth-card">
          <span className="account-card-label">Redefinir senha</span>
          <h2>Fale com o studio</h2>
          <p className="account-helper">
            Entre em contato pelo WhatsApp. Depois da confirmação dos seus
            dados, o studio enviará um link de uso único.
          </p>
          <a
            className="button button-gold account-submit"
            href={whatsappHref(settings.whatsapp)}
            target="_blank"
            rel="noreferrer"
          >
            Falar no WhatsApp <span>↗</span>
          </a>
          <Link
            className="account-forgot-link recovery-back-link"
            href="/minha-conta"
          >
            ← Voltar para o login
          </Link>
        </div>
      </section>
    </main>
  );
}
