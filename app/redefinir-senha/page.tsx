"use client";

import { useState } from "react";
import Link from "next/link";
import { PublicBrand } from "../public-settings";

export default function ResetPasswordPage() {
  const [password, setPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [message, setMessage] = useState("");
  const [isError, setIsError] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [completed, setCompleted] = useState(false);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage("");
    setIsError(false);
    const token =
      new URLSearchParams(window.location.search).get("token") ?? "";
    if (password !== confirmation) {
      setIsError(true);
      setMessage("As senhas precisam ser iguais.");
      return;
    }
    if (!token) {
      setIsError(true);
      setMessage("Esta recuperação local está incompleta.");
      return;
    }
    setSubmitting(true);
    try {
      const response = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, password }),
      });
      const result = await response.json().catch(() => ({}));
      if (!response.ok)
        throw new Error(
          typeof result.message === "string"
            ? result.message
            : "Não foi possível redefinir sua senha.",
        );
      setCompleted(true);
      setPassword("");
      setConfirmation("");
      setMessage(
        typeof result.message === "string"
          ? result.message
          : "Senha redefinida com sucesso.",
      );
    } catch (error) {
      setIsError(true);
      setMessage(
        error instanceof Error
          ? error.message
          : "Não foi possível redefinir sua senha.",
      );
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="account-page">
      <header className="site-header">
        <PublicBrand />
        <Link className="header-cta" href="/minha-conta">
          Minha conta <span>↗</span>
        </Link>
      </header>
      <section className="account-auth-shell password-recovery-shell">
        <div className="account-auth-intro">
          <p className="eyebrow">
            Nova senha <span>✦</span>
          </p>
          <h1>
            Seu acesso,
            <br />
            <em>protegido novamente.</em>
          </h1>
          <p>
            Crie uma senha exclusiva com pelo menos 8 caracteres. Ao concluir,
            todas as sessões antigas serão encerradas.
          </p>
        </div>
        <div className="account-auth-card">
          <span className="account-card-label">Redefinição local</span>
          <h2>{completed ? "Tudo pronto." : "Crie sua nova senha."}</h2>
          {completed ? (
            <Link
              className="button button-gold account-submit"
              href="/minha-conta"
            >
              Entrar na minha conta <span>↗</span>
            </Link>
          ) : (
            <form onSubmit={submit}>
              <label>
                Nova senha
                <input
                  type="password"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  autoComplete="new-password"
                  minLength={8}
                  maxLength={128}
                  required
                />
              </label>
              <label>
                Confirme a nova senha
                <input
                  type="password"
                  value={confirmation}
                  onChange={(event) => setConfirmation(event.target.value)}
                  autoComplete="new-password"
                  minLength={8}
                  maxLength={128}
                  required
                />
              </label>
              <button
                className="button button-gold account-submit"
                type="submit"
                disabled={submitting}
              >
                {submitting ? "Salvando…" : "Salvar nova senha"} <span>↗</span>
              </button>
            </form>
          )}
          {message && (
            <p
              className={`account-feedback ${isError ? "error" : ""}`}
              role={isError ? "alert" : "status"}
            >
              {message}
            </p>
          )}
        </div>
      </section>
    </main>
  );
}
