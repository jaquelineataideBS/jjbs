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

type AccountAppointment = {
  id: string;
  appointmentDate: string;
  startTime: string;
  endTime: string;
  status: string;
  totalEstimatedCents: number | null;
  serviceId: string | null;
  serviceName: string | null;
  professionalId: string | null;
  professionalName: string | null;
  canCancel: boolean;
};

type ProfileData = { name: string; email: string; phone: string };

type AppointmentSummary = {
  upcoming: AccountAppointment[];
  history: AccountAppointment[];
};

type FormData = {
  name: string;
  email: string;
  phone: string;
  password: string;
  passwordConfirmation: string;
};

const emptyForm: FormData = { name: "", email: "", phone: "", password: "", passwordConfirmation: "" };
const emptyAppointments: AppointmentSummary = { upcoming: [], history: [] };
const statusLabels: Record<string, string> = {
  pending_confirmation: "Aguardando confirmação",
  confirmed: "Confirmado",
  in_service: "Em atendimento",
  completed: "Concluído",
  cancelled_by_client: "Cancelado por você",
  cancelled_by_salon: "Cancelado pelo studio",
  no_show: "Não compareceu",
  rescheduled: "Reagendado",
};

function dateLabel(value: string) {
  const [year, month, day] = value.split("-");
  return `${day}/${month}/${year}`;
}

function money(value: number | null) {
  if (value === null) return "Valor sob consulta";
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value / 100);
}

export default function MyAccountPage() {
  const [mode, setMode] = useState<"login" | "register">("login");
  const [form, setForm] = useState<FormData>(emptyForm);
  const [user, setUser] = useState<AccountUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState("");
  const [isError, setIsError] = useState(false);
  const [appointments, setAppointments] = useState<AppointmentSummary>(emptyAppointments);
  const [appointmentsLoading, setAppointmentsLoading] = useState(false);
  const [cancellingId, setCancellingId] = useState<string | null>(null);
  const [editingProfile, setEditingProfile] = useState(false);
  const [profileSaving, setProfileSaving] = useState(false);
  const [profile, setProfile] = useState<ProfileData>({ name: "", email: "", phone: "" });

  async function loadAppointments() {
    setAppointmentsLoading(true);
    try {
      const response = await fetch("/api/account/appointments", { cache: "no-store" });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(typeof result.message === "string" ? result.message : "Não foi possível carregar seus horários.");
      setAppointments({
        upcoming: Array.isArray(result.upcoming) ? result.upcoming as AccountAppointment[] : [],
        history: Array.isArray(result.history) ? result.history as AccountAppointment[] : [],
      });
    } catch (error) {
      setIsError(true);
      setMessage(error instanceof Error ? error.message : "Não foi possível carregar seus horários.");
    } finally {
      setAppointmentsLoading(false);
    }
  }

  useEffect(() => {
    fetch("/api/auth/me", { cache: "no-store" })
      .then(async (response) => {
        if (!response.ok) {
          const result = await response.json().catch(() => ({}));
          if (response.status === 503 && typeof result.message === "string") setMessage(result.message);
          return;
        }
        const result = await response.json();
        if (result.user) {
          const accountUser = result.user as AccountUser;
          setUser(accountUser);
          setProfile({ name: accountUser.name, email: accountUser.email, phone: accountUser.phone ?? "" });
          void loadAppointments();
        }
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
      const accountUser = result.user as AccountUser;
      setUser(accountUser);
      setProfile({ name: accountUser.name, email: accountUser.email, phone: accountUser.phone ?? "" });
      await loadAppointments();
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
    setEditingProfile(false);
    setProfile({ name: "", email: "", phone: "" });
    setAppointments(emptyAppointments);
    setMode("login");
    setMessage("Sessão encerrada.");
  }

  async function cancelAppointment(appointment: AccountAppointment) {
    if (!window.confirm(`Cancelar ${appointment.serviceName ?? "este atendimento"} em ${dateLabel(appointment.appointmentDate)}, às ${appointment.startTime}?`)) return;

    setCancellingId(appointment.id);
    setMessage("");
    setIsError(false);
    try {
      const response = await fetch("/api/account/appointments", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: appointment.id }),
      });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(typeof result.message === "string" ? result.message : "Não foi possível cancelar agora.");
      setMessage(typeof result.message === "string" ? result.message : "Agendamento cancelado.");
      await loadAppointments();
    } catch (error) {
      setIsError(true);
      setMessage(error instanceof Error ? error.message : "Não foi possível cancelar agora.");
    } finally {
      setCancellingId(null);
    }
  }

  async function saveProfile(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setProfileSaving(true);
    setMessage("");
    setIsError(false);
    try {
      const response = await fetch("/api/account/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(profile),
      });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(typeof result.message === "string" ? result.message : "Não foi possível atualizar seus dados.");
      const updatedUser = result.user as AccountUser;
      setUser(updatedUser);
      setProfile({ name: updatedUser.name, email: updatedUser.email, phone: updatedUser.phone ?? "" });
      setEditingProfile(false);
      setMessage(typeof result.message === "string" ? result.message : "Seus dados foram atualizados.");
    } catch (error) {
      setIsError(true);
      setMessage(error instanceof Error ? error.message : "Não foi possível atualizar seus dados.");
    } finally {
      setProfileSaving(false);
    }
  }

  return (
    <main className="account-page">
      <header className="site-header">
        <a className="brand" href="/" aria-label="Jaqueline Justino Beauty Studio - início">
          <span className="brand-symbol" aria-hidden="true"><img src="/jaqueline-justino-monogram.png?v=1" alt="" /></span>
          <span className="brand-name"><strong>Jaqueline Justino</strong><small>Beauty Studio</small></span>
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
          {message && <p className={`account-feedback ${isError ? "error" : ""}`} role={isError ? "alert" : "status"}>{message}</p>}
          <div className="account-dashboard-grid">
            <article className={`account-card account-card-main ${appointments.upcoming.length ? "has-appointments" : ""}`}>
              <span className="account-card-label">Próximos agendamentos</span>
              {appointmentsLoading ? <p className="account-empty">Carregando seus horários…</p> : appointments.upcoming.length ? <div className="account-appointment-list">{appointments.upcoming.map((appointment) => <div className="account-appointment" key={appointment.id}><div><small>{statusLabels[appointment.status] ?? appointment.status}</small><strong>{appointment.serviceName ?? "Atendimento no studio"}</strong><span>{dateLabel(appointment.appointmentDate)} · {appointment.startTime}–{appointment.endTime}</span><span>{appointment.professionalName ?? "Profissional do studio"} · {money(appointment.totalEstimatedCents)}</span></div>{appointment.canCancel && <div className="account-appointment-actions"><a className="text-button" href={`/agendar?reschedule=${encodeURIComponent(appointment.id)}&service=${encodeURIComponent(appointment.serviceId ?? "")}&professional=${encodeURIComponent(appointment.professionalId ?? "")}`}>Reagendar</a><button className="text-button" type="button" disabled={cancellingId === appointment.id} onClick={() => void cancelAppointment(appointment)}>{cancellingId === appointment.id ? "Cancelando…" : "Cancelar"}</button></div>}</div>)}</div> : <><h2>Seu próximo cuidado<br /><em>ainda não foi marcado.</em></h2><p>Escolha um serviço e encontre um horário para viver a experiência JBS.</p></>}
              <a className="button button-dark" href="/agendar">{appointments.upcoming.length ? "Agendar novo horário" : "Agendar meu horário"} <span>↗</span></a>
            </article>
            <article className={`account-card ${appointments.history.length ? "has-appointments" : ""}`}>
              <span className="account-card-label">Seu histórico</span>
              {appointmentsLoading ? <p className="account-empty">Organizando seu histórico…</p> : appointments.history.length ? <div className="account-appointment-list">{appointments.history.slice(0, 8).map((appointment) => <div className="account-appointment" key={appointment.id}><div><small>{statusLabels[appointment.status] ?? appointment.status}</small><strong>{appointment.serviceName ?? "Atendimento no studio"}</strong><span>{dateLabel(appointment.appointmentDate)} · {appointment.startTime}</span><span>{appointment.professionalName ?? "Profissional do studio"} · {money(appointment.totalEstimatedCents)}</span></div></div>)}</div> : <><h2>Os momentos que<br /><em>já vivemos juntas.</em></h2><p className="account-empty">Seu histórico aparecerá aqui depois do primeiro atendimento.</p></>}
            </article>
            <article className="account-card account-profile-card"><span className="account-card-label">Seus dados</span>{editingProfile ? <form className="account-profile-form" onSubmit={saveProfile}><label>Nome completo<input value={profile.name} onChange={(event) => setProfile((current) => ({ ...current, name: event.target.value }))} required maxLength={120} /></label><label>E-mail<input type="email" value={profile.email} onChange={(event) => setProfile((current) => ({ ...current, email: event.target.value }))} required maxLength={160} /></label><label>WhatsApp<input value={profile.phone} onChange={(event) => setProfile((current) => ({ ...current, phone: event.target.value }))} required maxLength={30} inputMode="tel" /></label><div className="account-profile-actions"><button className="button button-gold" type="submit" disabled={profileSaving}>{profileSaving ? "Salvando…" : "Salvar dados"}</button><button className="text-button" type="button" onClick={() => { setEditingProfile(false); setProfile({ name: user.name, email: user.email, phone: user.phone ?? "" }); }}>Cancelar</button></div></form> : <><strong>{user.name}</strong><p>{user.email}<br />{user.phone ?? "Telefone não informado"}</p><button className="text-button" type="button" onClick={() => setEditingProfile(true)}>Editar meus dados</button></>}</article>
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
