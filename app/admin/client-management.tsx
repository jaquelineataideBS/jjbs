"use client";

/* eslint-disable react-hooks/set-state-in-effect -- dados administrativos são carregados após autenticação. */

import { FormEvent, useEffect, useState } from "react";
import { formatWhatsapp } from "../../lib/masks";

type Client = {
  id: string;
  userId: string | null;
  name: string;
  phone: string;
  whatsapp: string | null;
  email: string | null;
  birthDate: string | null;
  address: string | null;
  preferences: string | null;
  allergies: string | null;
  notes: string | null;
  photoConsent: boolean;
  marketingConsent: boolean;
  active: boolean;
  linkedAccount: boolean;
  attendanceCount: number;
  totalSpentCents: number;
  lastAppointment: string | null;
  nextAppointment: string | null;
  createdAt: string;
};

type HistoryItem = {
  id: string;
  appointmentDate: string;
  startTime: string;
  status: string;
  totalEstimatedCents: number | null;
  serviceName: string | null;
  professionalName: string | null;
};

type ClientForm = {
  id?: string;
  name: string;
  whatsapp: string;
  email: string;
  birthDate: string;
  address: string;
  preferences: string;
  allergies: string;
  notes: string;
  photoConsent: boolean;
  marketingConsent: boolean;
  active: boolean;
};

const emptyClient: ClientForm = {
  name: "",
  whatsapp: "",
  email: "",
  birthDate: "",
  address: "",
  preferences: "",
  allergies: "",
  notes: "",
  photoConsent: false,
  marketingConsent: false,
  active: true,
};
const statusLabels: Record<string, string> = {
  pending_confirmation: "Aguardando confirmação",
  confirmed: "Confirmado",
  in_service: "Em atendimento",
  completed: "Concluído",
  cancelled_by_client: "Cancelado pela cliente",
  cancelled_by_salon: "Cancelado pelo studio",
  no_show: "Não compareceu",
  rescheduled: "Reagendado",
};

function date(value: string | null) {
  return value ? value.split("-").reverse().join("/") : "—";
}

function money(cents: number | null) {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format((cents ?? 0) / 100);
}

function messageOf(value: unknown, fallback: string) {
  return typeof value === "object" &&
    value &&
    "message" in value &&
    typeof value.message === "string"
    ? value.message
    : fallback;
}

export default function ClientManagement() {
  const [clients, setClients] = useState<Client[]>([]);
  const [form, setForm] = useState<ClientForm>(emptyClient);
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [feedback, setFeedback] = useState("");
  const [isError, setIsError] = useState(false);
  const [selected, setSelected] = useState<Client | null>(null);
  const [history, setHistory] = useState<HistoryItem[]>([]);

  async function request(url: string, options?: RequestInit) {
    const response = await fetch(url, { cache: "no-store", ...options });
    const result: unknown = await response.json().catch(() => ({}));
    if (!response.ok)
      throw new Error(
        messageOf(result, "Não foi possível concluir a operação."),
      );
    return result as Record<string, unknown>;
  }

  async function load(search = query) {
    setLoading(true);
    try {
      const result = await request(
        `/api/admin/clients?q=${encodeURIComponent(search)}`,
      );
      setClients(
        Array.isArray(result.clients) ? (result.clients as Client[]) : [],
      );
      setIsError(false);
    } catch (cause) {
      setIsError(true);
      setFeedback(
        cause instanceof Error
          ? cause.message
          : "Não foi possível carregar as clientes.",
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load("");
    // A carga inicial usa busca vazia; as próximas buscas são disparadas pelo formulário.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function edit(client: Client) {
    setForm({
      id: client.id,
      name: client.name,
      whatsapp: formatWhatsapp(client.whatsapp ?? client.phone),
      email: client.email ?? "",
      birthDate: client.birthDate ?? "",
      address: client.address ?? "",
      preferences: client.preferences ?? "",
      allergies: client.allergies ?? "",
      notes: client.notes ?? "",
      photoConsent: client.photoConsent,
      marketingConsent: client.marketingConsent,
      active: client.active,
    });
    setSelected(client);
    setHistory([]);
  }

  async function openRecord(client: Client) {
    edit(client);
    try {
      const result = await request(
        `/api/admin/clients?id=${encodeURIComponent(client.id)}`,
      );
      setSelected(result.client as Client);
      setHistory(
        Array.isArray(result.history) ? (result.history as HistoryItem[]) : [],
      );
    } catch (cause) {
      setIsError(true);
      setFeedback(
        cause instanceof Error
          ? cause.message
          : "Não foi possível abrir a ficha da cliente.",
      );
    }
  }

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    try {
      const result = await request("/api/admin/clients", {
        method: form.id ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      setFeedback(messageOf(result, "Cliente salva com sucesso."));
      setIsError(false);
      setForm(emptyClient);
      setSelected(null);
      setHistory([]);
      await load();
    } catch (cause) {
      setIsError(true);
      setFeedback(
        cause instanceof Error
          ? cause.message
          : "Não foi possível salvar a cliente.",
      );
    } finally {
      setSaving(false);
    }
  }

  function reset() {
    setForm(emptyClient);
    setSelected(null);
    setHistory([]);
    setFeedback("");
  }

  return (
    <section className="admin-client-module">
      {feedback && (
        <p
          className={`admin-feedback ${isError ? "error" : ""}`}
          role={isError ? "alert" : "status"}
        >
          {feedback}
        </p>
      )}
      <div className="admin-clients-layout">
        <form className="admin-service-form admin-client-form" onSubmit={save}>
          <div className="admin-panel-heading">
            <div>
              <span>{form.id ? "Editar ficha" : "Nova cliente"}</span>
              <h2>{form.id ? "Dados da cliente." : "Cadastrar cliente."}</h2>
            </div>
            {form.id && (
              <button className="text-button" type="button" onClick={reset}>
                Novo cadastro
              </button>
            )}
          </div>
          <div className="admin-form-grid">
            <label>
              Nome completo
              <input
                value={form.name}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    name: event.target.value,
                  }))
                }
                maxLength={120}
                required
              />
            </label>
            <label>
              Data de nascimento
              <input
                type="date"
                value={form.birthDate}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    birthDate: event.target.value,
                  }))
                }
              />
            </label>
          </div>
          <label>
            WhatsApp
            <input
              value={form.whatsapp}
              onChange={(event) =>
                setForm((current) => ({
                  ...current,
                  whatsapp: formatWhatsapp(event.target.value),
                }))
              }
              autoComplete="tel"
              inputMode="tel"
              maxLength={15}
              placeholder="(85) 99999-0000"
              required
            />
          </label>
          <label>
            E-mail
            <input
              type="email"
              value={form.email}
              onChange={(event) =>
                setForm((current) => ({
                  ...current,
                  email: event.target.value,
                }))
              }
              maxLength={160}
            />
          </label>
          <label>
            Endereço opcional
            <input
              value={form.address}
              onChange={(event) =>
                setForm((current) => ({
                  ...current,
                  address: event.target.value,
                }))
              }
              maxLength={300}
            />
          </label>
          <label>
            Preferências
            <textarea
              value={form.preferences}
              onChange={(event) =>
                setForm((current) => ({
                  ...current,
                  preferences: event.target.value,
                }))
              }
              maxLength={1000}
              rows={3}
              placeholder="Ex.: produtos preferidos, estilo e frequência"
            />
          </label>
          <label>
            Alergias ou sensibilidades
            <textarea
              value={form.allergies}
              onChange={(event) =>
                setForm((current) => ({
                  ...current,
                  allergies: event.target.value,
                }))
              }
              maxLength={1000}
              rows={3}
              placeholder="Informação sensível, visível apenas na administração"
            />
          </label>
          <label>
            Observações internas
            <textarea
              value={form.notes}
              onChange={(event) =>
                setForm((current) => ({
                  ...current,
                  notes: event.target.value,
                }))
              }
              maxLength={2000}
              rows={4}
            />
          </label>
          <label className="admin-toggle">
            <input
              type="checkbox"
              checked={form.photoConsent}
              onChange={(event) =>
                setForm((current) => ({
                  ...current,
                  photoConsent: event.target.checked,
                }))
              }
            />{" "}
            Autorizou fotos dos resultados
          </label>
          <label className="admin-toggle">
            <input
              type="checkbox"
              checked={form.marketingConsent}
              onChange={(event) =>
                setForm((current) => ({
                  ...current,
                  marketingConsent: event.target.checked,
                }))
              }
            />{" "}
            Autorizou comunicações e promoções
          </label>
          <label className="admin-toggle">
            <input
              type="checkbox"
              checked={form.active}
              onChange={(event) =>
                setForm((current) => ({
                  ...current,
                  active: event.target.checked,
                }))
              }
            />{" "}
            Cadastro ativo
          </label>
          <button
            className="button button-gold"
            type="submit"
            disabled={saving}
          >
            {saving
              ? "Salvando…"
              : form.id
                ? "Salvar alterações"
                : "Cadastrar cliente"}
            <span>↗</span>
          </button>
        </form>

        <div className="admin-client-stack">
          <section className="admin-panel">
            <div className="admin-panel-heading">
              <div>
                <span>Relacionamento</span>
                <h2>Clientes cadastradas</h2>
              </div>
              <p>Busca por nome, WhatsApp ou e-mail.</p>
            </div>
            <form
              className="admin-client-search"
              onSubmit={(event) => {
                event.preventDefault();
                void load();
              }}
            >
              <label className="sr-only" htmlFor="client-search">
                Buscar cliente
              </label>
              <input
                id="client-search"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Buscar cliente…"
              />
              <button className="text-button" type="submit" disabled={loading}>
                Buscar
              </button>
              {query && (
                <button
                  className="text-button"
                  type="button"
                  onClick={() => {
                    setQuery("");
                    void load("");
                  }}
                >
                  Limpar
                </button>
              )}
            </form>
            {loading ? (
              <p className="admin-loading">Carregando clientes…</p>
            ) : clients.length ? (
              <div className="admin-client-list">
                {clients.map((client) => (
                  <article
                    className={!client.active ? "inactive" : ""}
                    key={client.id}
                  >
                    <div className="admin-client-identity">
                      <span>
                        {client.linkedAccount
                          ? "Conta vinculada"
                          : "Cadastro interno"}
                      </span>
                      <h3>{client.name}</h3>
                      <p>
                        {client.whatsapp ?? client.phone} ·{" "}
                        {client.email ?? "sem e-mail"}
                      </p>
                    </div>
                    <div className="admin-client-metrics">
                      <span>
                        <strong>{client.attendanceCount}</strong> atendimentos
                      </span>
                      <span>
                        <strong>{money(client.totalSpentCents)}</strong>{" "}
                        estimado realizado
                      </span>
                      <span>
                        <strong>{date(client.nextAppointment)}</strong> próximo
                        horário
                      </span>
                    </div>
                    <div className="admin-client-actions">
                      <button
                        className="text-button"
                        type="button"
                        onClick={() => void openRecord(client)}
                      >
                        Ver ficha
                      </button>
                      <button
                        className="text-button"
                        type="button"
                        onClick={() => edit(client)}
                      >
                        Editar
                      </button>
                    </div>
                  </article>
                ))}
              </div>
            ) : (
              <div className="admin-empty">
                <h2>Nenhuma cliente encontrada.</h2>
                <p>Cadastre uma nova cliente ou limpe a busca.</p>
              </div>
            )}
          </section>

          {selected && (
            <section className="admin-panel admin-client-record">
              <div className="admin-panel-heading">
                <div>
                  <span>Ficha da cliente</span>
                  <h2>{selected.name}</h2>
                </div>
                <p>Dados protegidos e histórico recente.</p>
              </div>
              <div className="admin-client-sensitive">
                <article>
                  <span>Preferências</span>
                  <p>{selected.preferences || "Não informadas."}</p>
                </article>
                <article>
                  <span>Alergias e sensibilidades</span>
                  <p>{selected.allergies || "Não informadas."}</p>
                </article>
                <article>
                  <span>Observações internas</span>
                  <p>{selected.notes || "Sem observações."}</p>
                </article>
              </div>
              <div className="admin-client-history">
                <h3>Histórico de serviços</h3>
                {history.length ? (
                  history.map((item) => (
                    <article key={item.id}>
                      <div>
                        <strong>
                          {item.serviceName ?? "Serviço não identificado"}
                        </strong>
                        <small>
                          {date(item.appointmentDate)} às {item.startTime} ·{" "}
                          {item.professionalName ??
                            "Profissional não informada"}
                        </small>
                      </div>
                      <div>
                        <strong>{money(item.totalEstimatedCents)}</strong>
                        <small>
                          {statusLabels[item.status] ?? item.status}
                        </small>
                      </div>
                    </article>
                  ))
                ) : (
                  <p>
                    Abra a ficha para carregar os atendimentos ou ainda não há
                    histórico.
                  </p>
                )}
              </div>
            </section>
          )}
        </div>
      </div>
    </section>
  );
}
