"use client";

/* eslint-disable react-hooks/set-state-in-effect -- usuários protegidos são carregados após autenticação. */

import { FormEvent, useEffect, useMemo, useState } from "react";
import { formatWhatsapp } from "../../lib/masks";

type InternalUser = {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  role: "admin" | "manager" | "staff";
  status: "active" | "inactive";
  createdAt: string;
  professionalId: string | null;
  professionalName: string | null;
};

type Professional = { id: string; name: string; title: string | null; userId: string | null; active: boolean };
type Data = { users: InternalUser[]; professionals: Professional[]; currentUserId: string };
type Form = { id?: string; name: string; email: string; phone: string; role: InternalUser["role"]; status: InternalUser["status"]; professionalId: string; password: string };

const emptyForm: Form = { name: "", email: "", phone: "", role: "staff", status: "active", professionalId: "", password: "" };
const roleLabels = { admin: "Administrador", manager: "Gestão", staff: "Funcionário" } as const;

export default function UsersManagement() {
  const [data, setData] = useState<Data | null>(null);
  const [form, setForm] = useState<Form>(emptyForm);
  const [query, setQuery] = useState("");
  const [feedback, setFeedback] = useState("");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  async function load() {
    const response = await fetch("/api/admin/users", { cache: "no-store" });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(typeof payload.message === "string" ? payload.message : "Não foi possível carregar os usuários.");
    setData(payload as Data);
  }

  useEffect(() => { void load().catch((reason) => setError(reason instanceof Error ? reason.message : "Não foi possível carregar os usuários.")); }, []);

  const filteredUsers = useMemo(() => {
    const normalized = query.trim().toLocaleLowerCase("pt-BR");
    if (!normalized) return data?.users ?? [];
    return (data?.users ?? []).filter((user) => `${user.name} ${user.email} ${user.professionalName ?? ""} ${roleLabels[user.role]}`.toLocaleLowerCase("pt-BR").includes(normalized));
  }, [data, query]);

  function edit(user: InternalUser) {
    setForm({ id: user.id, name: user.name, email: user.email, phone: formatWhatsapp(user.phone ?? ""), role: user.role, status: user.status, professionalId: user.professionalId ?? "", password: "" });
    setFeedback(""); setError("");
  }

  async function submit(event: FormEvent) {
    event.preventDefault(); setSaving(true); setFeedback(""); setError("");
    try {
      const response = await fetch("/api/admin/users", { method: form.id ? "PATCH" : "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(form) });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(typeof payload.message === "string" ? payload.message : "Não foi possível salvar o usuário.");
      setFeedback(typeof payload.message === "string" ? payload.message : "Usuário salvo.");
      setForm(emptyForm);
      await load();
    } catch (reason) { setError(reason instanceof Error ? reason.message : "Não foi possível salvar o usuário."); }
    finally { setSaving(false); }
  }

  const availableProfessionals = data?.professionals.filter((professional) => !professional.userId || professional.userId === form.id) ?? [];
  const editingSelf = Boolean(form.id && form.id === data?.currentUserId);

  return (
    <section className="users-module">
      <div className="admin-panel-heading"><div><span>Acessos e permissões</span><h2>Usuários internos</h2></div><p>Cadastre gestão e funcionários com acesso compatível com cada responsabilidade.</p></div>
      {feedback && <p className="admin-feedback" role="status">{feedback}</p>}
      {error && <p className="admin-feedback error" role="alert">{error}</p>}
      <div className="users-layout">
        <form className="admin-service-form users-form" onSubmit={submit}>
          <div className="finance-form-title"><span>{form.id ? "Editar acesso" : "Novo acesso"}</span><h3>{form.id ? "Atualizar usuário" : "Cadastrar usuário"}</h3></div>
          <label>Nome completo<input value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} maxLength={120} required /></label>
          <label>E-mail de acesso<input type="email" value={form.email} onChange={(event) => setForm({ ...form, email: event.target.value })} maxLength={160} autoComplete="off" required /></label>
          <label>WhatsApp<input value={form.phone} onChange={(event) => setForm({ ...form, phone: formatWhatsapp(event.target.value) })} inputMode="tel" maxLength={15} placeholder="(85) 99999-0000" required /></label>
          <div className="admin-form-grid">
            <label>Cargo<select value={form.role} disabled={editingSelf} onChange={(event) => setForm({ ...form, role: event.target.value as Form["role"] })}><option value="staff">Funcionário</option><option value="manager">Gestão</option><option value="admin">Administrador</option></select></label>
            <label>Status<select value={form.status} disabled={editingSelf} onChange={(event) => setForm({ ...form, status: event.target.value as Form["status"] })}><option value="active">Ativo</option><option value="inactive">Inativo</option></select></label>
          </div>
          <label>Vincular à profissional<select value={form.professionalId} onChange={(event) => setForm({ ...form, professionalId: event.target.value })}><option value="">Sem vínculo</option>{availableProfessionals.map((professional) => <option key={professional.id} value={professional.id}>{professional.name}{professional.title ? ` · ${professional.title}` : ""}</option>)}</select></label>
          <label>{form.id ? "Nova senha (opcional)" : "Senha inicial"}<input type="password" value={form.password} onChange={(event) => setForm({ ...form, password: event.target.value })} minLength={8} maxLength={128} autoComplete="new-password" required={!form.id} placeholder={form.id ? "Preencha somente para redefinir" : "Mínimo de 8 caracteres"} /></label>
          <div className="finance-form-actions">{form.id && <button className="text-button" type="button" onClick={() => setForm(emptyForm)}>Cancelar</button>}<button className="button button-gold" disabled={saving}><span>{saving ? "Salvando..." : form.id ? "Salvar alterações" : "Criar usuário"}</span><b>→</b></button></div>
        </form>
        <section className="admin-panel users-list-panel">
          <div className="finance-toolbar"><div><span>Equipe com acesso</span><h3>Contas internas</h3></div><input aria-label="Buscar usuário" placeholder="Buscar nome ou e-mail" value={query} onChange={(event) => setQuery(event.target.value)} /></div>
          <div className="users-permission-summary"><span><strong>Administrador</strong>Acesso total e usuários</span><span><strong>Gestão</strong>Operação e relatórios</span><span><strong>Funcionário</strong>Agenda e clientes</span></div>
          {filteredUsers.length ? <div className="users-list">{filteredUsers.map((user) => <article className={user.status === "inactive" ? "inactive" : ""} key={user.id}><div><span>{roleLabels[user.role]} · {user.status === "active" ? "Ativo" : "Inativo"}</span><h4>{user.name}</h4><p>{user.email} · {formatWhatsapp(user.phone ?? "")}</p>{user.professionalName && <small>Profissional: {user.professionalName}</small>}</div><button className="text-button" type="button" onClick={() => edit(user)}>Editar</button></article>)}</div> : <p className="admin-empty-state">Nenhum usuário interno encontrado.</p>}
        </section>
      </div>
    </section>
  );
}
