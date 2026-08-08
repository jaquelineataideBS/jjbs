"use client";

/* eslint-disable @next/next/no-html-link-for-pages -- o preview usa links nativos nas páginas públicas. */

import { useEffect, useState } from "react";

type AccountUser = {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  role: string;
};

type FormData = {
  name: string;
  email: string;
  phone: string;
  password: string;
  passwordConfirmation: string;
};

const emptyForm: FormData = { name: "", email: "", phone: "", password: "", passwordConfirmation: "" };

export default function MyAccountPage() {
  const [mode, setMode] = useState<"login" | "register">("login");
  const [form, setForm] = useState<FormData>(emptyForm);
  const [user, setUser] = useState<AccountUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState("");
  const [isError, setIsError] = useState(false);

  useEffect(() => {
    fetch("/api/auth/me", { cache: "no-store" })
      .then(async (response) => {
        if (!response.ok) {
          const result = await response.json().catch(() => ({}));
          if (response.status === 503 && typeof result.message === "string") setMessage(result.message);
          return;
        }
        const result = await response.json();
        if (result.user) setUser(result.user as AccountUser);
      })
      .catch(() => setMessage("Não foi possível verificar sua sessão agora."))
      .finally(() => setLoading(false));
  }, []);

  function updateField(field: keyof FormData, value: string) {
    setForm((current) => ({ ...current, [field]: value }));
    setMessage("");
    setIsError(false);
  }

  function changeMode(nextMode: "login" | "register") {
    setMode(nextMode);
    setForm(emptyForm);
    setMessage("");
    setIsError(false);
  }

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage("");
    setIsError(false);

    if (mode === "register" && form.password !== form.passwordConfirmation) {
      setIsError(true);
      setMessage("As senhas precisam ser iguais.");
      return;
    }

    setSubmitting(true);
    try {
      const response = await fetch(`/api/auth/${mode}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: form.name, email: form.email, phone: form.phone, password: form.password }),
      });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(typeof result.message === "string" ? result.message : "Não foi possível concluir agora.");
      setUser(result.user as AccountUser);
      setMessage(mode === "register" ? "Conta criada com segurança." : "Login realizado com sucesso.");
      setForm(emptyForm);
    } catch (error) {
      setIsError(true);
      setMessage(error instanceof Error ? error.message : "Não foi possível concluir agora.");
    } finally {
      setSubmitting(false);
    }
  }

  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" }).catch(() => undefined);
    setUser(null);
    setMode("login");
    setMessage("Sessão encerrada.");
  }

  return (
    <main className="account-page">
      <header className="site-header">
        <a className="brand" href="/" aria-label="Jaqueline Beauty Studio - início">
          <span className="brand-mark">J</span>
          <span><strong>Jaqueline</strong><small>Beauty Studio</small></span>
        </a>
        <nav className="main-nav" aria-label="Navegação principal">
          <a href="/">Início</a><a href="/servicos">Serviços</a><a href="/trabalhos">Trabalhos</a><a href="/#studio">O studio</a><a href="/contato">Contato</a>
        </nav>
        <a className="header-cta" href="/agendar">Agendar horário <span>↗</span></a>
      </header>

      {loading ? (
        <section className="account-loading" aria-live="polite"><span className="eyebrow">Minha conta</span><h1>Preparando seu<br /><em>espaço de cuidado.</em></h1></section>
      ) : user ? (
        <section className="account-dashboard">
          <div className="account-dashboard-heading">
            <div><p className="eyebrow">Bem-vinda de volta <span>✦</span></p><h1>Olá, <em>{user.name.split(" ")[0]}.</em></h1><p>Seu espaço para acompanhar cada momento no studio.</p></div>
            <button className="text-button" type="button" onClick={logout}>Sair da conta</button>
          </div>
          {message && <p className="account-feedback" role="status">{message}</p>}
          <div className="account-dashboard-grid">
            <article className="account-card account-card-main"><span className="account-card-label">Próximo agendamento</span><h2>Seu próximo cuidado<br /><em>ainda não foi marcado.</em></h2><p>Escolha um serviço e encontre um horário para viver a experiência JBS.</p><a className="button button-gold" href="/agendar">Agendar meu horário <span>↗</span></a></article>
            <article className="account-card"><span className="account-card-label">Seu histórico</span><h2>Os momentos que<br /><em>já vivemos juntas.</em></h2><p className="account-empty">Seu histórico aparecerá aqui depois do primeiro atendimento.</p></article>
            <article className="account-card account-profile-card"><span className="account-card-label">Seus dados</span><strong>{user.name}</strong><p>{user.email}<br />{user.phone ?? "Telefone não informado"}</p><button className="text-button" type="button" disabled>Editar dados em breve</button></article>
            {user.role === "admin" && <article className="account-card account-profile-card"><span className="account-card-label">Administração</span><strong>Painel do studio</strong><p>Controle agenda, clientes e serviços com acesso protegido.</p><a className="text-link" href="/admin">Abrir painel administrativo <span>→</span></a></article>}
          </div>
        </section>
      ) : (
        <section className="account-auth-shell">
          <div className="account-auth-intro"><p className="eyebrow">Seu espaço JBS <span>✦</span></p><h1>O cuidado continua<br /><em>depois do studio.</em></h1><p>Acompanhe seus horários, consulte seu histórico e encontre o próximo momento para você.</p><div className="account-auth-points"><span>01 <b>Seus agendamentos</b></span><span>02 <b>Seu histórico</b></span><span>03 <b>Seu cuidado</b></span></div></div>
          <div className="account-auth-card">
            <div className="account-auth-tabs"><button className={mode === "login" ? "active" : ""} type="button" onClick={() => changeMode("login")}>Entrar</button><button className={mode === "register" ? "active" : ""} type="button" onClick={() => changeMode("register")}>Criar conta</button></div>
            <h2>{mode === "login" ? "Que bom ter você aqui." : "Comece o seu espaço."}</h2>
            <p className="account-helper">{mode === "login" ? "Entre para acompanhar seus próximos cuidados." : "Crie sua conta para guardar seus agendamentos."}</p>
            <form onSubmit={submit}>
              {mode === "register" && <label>Nome completo<input value={form.name} onChange={(event) => updateField("name", event.target.value)} autoComplete="name" required /></label>}
              <label>E-mail<input type="email" value={form.email} onChange={(event) => updateField("email", event.target.value)} autoComplete="email" required /></label>
              {mode === "register" && <label>WhatsApp<input value={form.phone} onChange={(event) => updateField("phone", event.target.value)} autoComplete="tel" inputMode="tel" required /></label>}
              <label>Senha<input type="password" value={form.password} onChange={(event) => updateField("password", event.target.value)} autoComplete={mode === "login" ? "current-password" : "new-password"} minLength={8} required /></label>
              {mode === "register" && <label>Confirme sua senha<input type="password" value={form.passwordConfirmation} onChange={(event) => updateField("passwordConfirmation", event.target.value)} autoComplete="new-password" minLength={8} required /></label>}
              <button className="button button-gold account-submit" type="submit" disabled={submitting}>{submitting ? "Aguarde..." : mode === "login" ? "Entrar na minha conta" : "Criar minha conta"} <span>↗</span></button>
            </form>
            {message && <p className={`account-feedback ${isError ? "error" : ""}`} role={isError ? "alert" : "status"}>{message}</p>}
            <p className="account-privacy">Seus dados são usados somente para cuidar do seu atendimento.</p>
          </div>
        </section>
      )}
    </main>
  );
}
