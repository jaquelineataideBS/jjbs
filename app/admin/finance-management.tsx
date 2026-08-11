"use client";

/* eslint-disable react-hooks/set-state-in-effect -- o painel financeiro carrega dados protegidos após a autenticação. */

import { FormEvent, useEffect, useMemo, useState } from "react";

type Method = { id: string; name: string; active: boolean; displayOrder: number };
type Appointment = {
  id: string;
  appointmentDate: string;
  startTime: string;
  status: string;
  totalEstimatedCents: number | null;
  clientName: string;
  professionalName: string | null;
  serviceName: string;
  paidCents: number;
  remainingCents: number;
  discountCents: number;
  surchargeCents: number;
  financialStatus: string;
};
type Transaction = {
  id: string;
  appointmentId: string;
  paymentMethodId: string | null;
  methodName: string | null;
  kind: string;
  amountCents: number;
  discountCents: number;
  surchargeCents: number;
  status: string;
  paidAt: string | null;
  transactionReference: string | null;
  notes: string | null;
  clientName: string;
  appointmentDate: string;
  professionalName: string;
  serviceName: string;
};
type Ranking = { name: string; amountCents: number };
type FinanceData = {
  methods: Method[];
  appointments: Appointment[];
  transactions: Transaction[];
  report: {
    todayCents: number;
    weekCents: number;
    monthCents: number;
    pendingCents: number;
    discountsCents: number;
    byMethod: Ranking[];
    byService: Ranking[];
    byProfessional: Ranking[];
  };
};
type PaymentForm = {
  id?: string;
  appointmentId: string;
  paymentMethodId: string;
  kind: string;
  amount: string;
  discount: string;
  surcharge: string;
  status: string;
  paidAt: string;
  transactionReference: string;
  notes: string;
};

const emptyForm: PaymentForm = {
  appointmentId: "",
  paymentMethodId: "pix",
  kind: "full",
  amount: "",
  discount: "0,00",
  surcharge: "0,00",
  status: "paid",
  paidAt: "",
  transactionReference: "",
  notes: "",
};
const statusLabels: Record<string, string> = {
  pending: "Pendente",
  partially_paid: "Parcialmente pago",
  paid: "Pago",
  refunded: "Estornado",
  cancelled: "Cancelado",
};
const kindLabels: Record<string, string> = {
  deposit: "Sinal",
  balance: "Saldo",
  full: "Pagamento completo",
};

function money(cents: number | null | undefined) {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format((cents ?? 0) / 100);
}

function toCents(value: string) {
  const normalized = value.trim().replace(/\./g, "").replace(",", ".");
  const amount = Number(normalized);
  return Number.isFinite(amount) && amount >= 0 ? Math.round(amount * 100) : -1;
}

function dateTimeLocal(value: string | null) {
  if (!value) return "";
  const date = new Date(value);
  const local = new Date(date.getTime() - date.getTimezoneOffset() * 60_000);
  return local.toISOString().slice(0, 16);
}

export default function FinanceManagement() {
  const [data, setData] = useState<FinanceData | null>(null);
  const [form, setForm] = useState<PaymentForm>(emptyForm);
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [feedback, setFeedback] = useState("");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  async function load() {
    const response = await fetch("/api/admin/finance", { cache: "no-store" });
    const payload = await response.json();
    if (!response.ok) throw new Error(payload.message ?? "Falha ao carregar.");
    setData(payload);
  }

  useEffect(() => {
    load().catch((reason) => setError(reason.message));
  }, []);

  const selectedAppointment = data?.appointments.find(
    (item) => item.id === form.appointmentId,
  );
  const filteredTransactions = useMemo(() => {
    const term = query.trim().toLocaleLowerCase("pt-BR");
    return (data?.transactions ?? []).filter(
      (item) =>
        (statusFilter === "all" || item.status === statusFilter) &&
        (!term ||
          [item.clientName, item.serviceName, item.methodName, item.transactionReference]
            .some((value) => value?.toLocaleLowerCase("pt-BR").includes(term))),
    );
  }, [data, query, statusFilter]);

  function chooseAppointment(appointmentId: string) {
    const appointment = data?.appointments.find((item) => item.id === appointmentId);
    setForm((current) => ({
      ...current,
      appointmentId,
      amount: appointment ? (appointment.remainingCents / 100).toFixed(2).replace(".", ",") : current.amount,
      kind: appointment?.paidCents ? "balance" : "full",
    }));
  }

  function edit(transaction: Transaction) {
    setForm({
      id: transaction.id,
      appointmentId: transaction.appointmentId,
      paymentMethodId: transaction.paymentMethodId ?? "",
      kind: transaction.kind,
      amount: (transaction.amountCents / 100).toFixed(2).replace(".", ","),
      discount: (transaction.discountCents / 100).toFixed(2).replace(".", ","),
      surcharge: (transaction.surchargeCents / 100).toFixed(2).replace(".", ","),
      status: transaction.status,
      paidAt: dateTimeLocal(transaction.paidAt),
      transactionReference: transaction.transactionReference ?? "",
      notes: transaction.notes ?? "",
    });
    window.scrollTo({ top: 460, behavior: "smooth" });
  }

  async function submit(event: FormEvent) {
    event.preventDefault();
    setError("");
    setFeedback("");
    const amountCents = toCents(form.amount);
    const discountCents = toCents(form.discount);
    const surchargeCents = toCents(form.surcharge);
    if (amountCents < 0 || discountCents < 0 || surchargeCents < 0) {
      setError("Revise os valores informados.");
      return;
    }
    setSaving(true);
    try {
      const response = await fetch("/api/admin/finance", {
        method: form.id ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          amountCents,
          discountCents,
          surchargeCents,
          paymentMethodId: form.paymentMethodId || null,
          paidAt: form.paidAt ? new Date(form.paidAt).toISOString() : null,
        }),
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.message ?? "Falha ao salvar.");
      setFeedback(payload.message);
      setForm(emptyForm);
      await load();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Falha ao salvar.");
    } finally {
      setSaving(false);
    }
  }

  async function toggleMethod(method: Method) {
    setError("");
    const response = await fetch("/api/admin/finance", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ resource: "method", id: method.id, active: !method.active }),
    });
    const payload = await response.json();
    if (!response.ok) {
      setError(payload.message ?? "Falha ao atualizar o método.");
      return;
    }
    setFeedback(payload.message);
    await load();
  }

  if (!data && !error) return <div className="admin-loading">Carregando financeiro...</div>;

  return (
    <section className="finance-module">
      <div className="admin-panel-heading">
        <div>
          <span>Controle financeiro</span>
          <h2>Recebimentos do studio</h2>
        </div>
        <p>Sinais, saldos, descontos e formas de pagamento no mesmo histórico.</p>
      </div>
      {feedback && <p className="admin-feedback">{feedback}</p>}
      {error && <p className="admin-feedback error">{error}</p>}

      {data && (
        <>
          <div className="finance-stats">
            <article><span>Hoje</span><strong>{money(data.report.todayCents)}</strong><small>recebido</small></article>
            <article><span>Últimos 7 dias</span><strong>{money(data.report.weekCents)}</strong><small>recebido</small></article>
            <article><span>Este mês</span><strong>{money(data.report.monthCents)}</strong><small>recebido</small></article>
            <article><span>A receber</span><strong>{money(data.report.pendingCents)}</strong><small>saldo dos agendamentos</small></article>
            <article><span>Descontos</span><strong>{money(data.report.discountsCents)}</strong><small>concedidos</small></article>
          </div>

          <div className="finance-layout">
            <form className="admin-service-form finance-form" onSubmit={submit}>
              <div className="finance-form-title">
                <span>{form.id ? "Editar lançamento" : "Novo lançamento"}</span>
                <h3>{form.id ? "Atualizar pagamento" : "Registrar pagamento"}</h3>
              </div>
              <label>
                Agendamento
                <select value={form.appointmentId} onChange={(event) => chooseAppointment(event.target.value)} required>
                  <option value="">Selecione</option>
                  {data.appointments.map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.appointmentDate.split("-").reverse().join("/")} · {item.clientName} · {item.serviceName}
                    </option>
                  ))}
                </select>
              </label>
              {selectedAppointment && (
                <div className="finance-appointment-summary">
                  <span>Serviço {money(selectedAppointment.totalEstimatedCents)}</span>
                  <span>Pago {money(selectedAppointment.paidCents)}</span>
                  <strong>Restante {money(selectedAppointment.remainingCents)}</strong>
                </div>
              )}
              <div className="admin-form-grid">
                <label>Tipo<select value={form.kind} onChange={(event) => setForm({ ...form, kind: event.target.value })}><option value="deposit">Sinal</option><option value="balance">Saldo</option><option value="full">Pagamento completo</option></select></label>
                <label>Status<select value={form.status} onChange={(event) => setForm({ ...form, status: event.target.value })}>{Object.entries(statusLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
              </div>
              <div className="admin-form-grid finance-values">
                <label>Valor recebido (R$)<input inputMode="decimal" value={form.amount} onChange={(event) => setForm({ ...form, amount: event.target.value })} required /></label>
                <label>Desconto (R$)<input inputMode="decimal" value={form.discount} onChange={(event) => setForm({ ...form, discount: event.target.value })} /></label>
                <label>Acréscimo (R$)<input inputMode="decimal" value={form.surcharge} onChange={(event) => setForm({ ...form, surcharge: event.target.value })} /></label>
              </div>
              <div className="admin-form-grid">
                <label>Método<select value={form.paymentMethodId} onChange={(event) => setForm({ ...form, paymentMethodId: event.target.value })}><option value="">Não informado</option>{data.methods.filter((item) => item.active || item.id === form.paymentMethodId).map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label>
                <label>Data do pagamento<input type="datetime-local" value={form.paidAt} onChange={(event) => setForm({ ...form, paidAt: event.target.value })} /></label>
              </div>
              <label>Referência da transação<input value={form.transactionReference} onChange={(event) => setForm({ ...form, transactionReference: event.target.value })} placeholder="Comprovante ou código" /></label>
              <label>Observações<textarea value={form.notes} onChange={(event) => setForm({ ...form, notes: event.target.value })} /></label>
              <div className="finance-form-actions">
                {form.id && <button className="text-button" type="button" onClick={() => setForm(emptyForm)}>Cancelar edição</button>}
                <button className="button button-gold" disabled={saving} type="submit"><span>{saving ? "Salvando..." : form.id ? "Salvar alterações" : "Registrar pagamento"}</span><b>→</b></button>
              </div>
            </form>

            <div className="admin-panel finance-history">
              <div className="finance-toolbar">
                <div><span>Histórico</span><h3>Lançamentos</h3></div>
                <div className="finance-filters">
                  <input aria-label="Buscar lançamento" placeholder="Buscar cliente ou serviço" value={query} onChange={(event) => setQuery(event.target.value)} />
                  <select aria-label="Filtrar por status" value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)}><option value="all">Todos os status</option>{Object.entries(statusLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select>
                </div>
              </div>
              {filteredTransactions.length ? (
                <div className="finance-transaction-list">
                  {filteredTransactions.map((item) => (
                    <article key={item.id}>
                      <div><span>{item.appointmentDate ? item.appointmentDate.split("-").reverse().join("/") : "Sem data"} · {kindLabels[item.kind]}</span><h4>{item.clientName}</h4><p>{item.serviceName} · {item.methodName ?? "Método não informado"}</p></div>
                      <div><strong>{money(item.amountCents)}</strong><small>{statusLabels[item.status]}</small><button className="text-button" type="button" onClick={() => edit(item)}>Editar</button></div>
                    </article>
                  ))}
                </div>
              ) : <p className="admin-empty-state">Nenhum lançamento encontrado.</p>}
            </div>
          </div>

          <div className="finance-reports">
            <RankingCard title="Por forma de pagamento" items={data.report.byMethod} />
            <RankingCard title="Por serviço" items={data.report.byService} />
            <RankingCard title="Por profissional" items={data.report.byProfessional} />
          </div>
          <section className="finance-methods admin-panel">
            <div><span>Configurações</span><h3>Formas de pagamento</h3><p>Pagamento dividido também pode ser registrado em mais de um lançamento para o mesmo agendamento.</p></div>
            <div>{data.methods.map((method) => <button className={method.active ? "active" : ""} key={method.id} type="button" onClick={() => toggleMethod(method)}><span>{method.name}</span><small>{method.active ? "Ativo" : "Inativo"}</small></button>)}</div>
          </section>
        </>
      )}
    </section>
  );
}

function RankingCard({ title, items }: { title: string; items: Ranking[] }) {
  return (
    <article className="admin-panel finance-ranking">
      <span>Receita recebida</span><h3>{title}</h3>
      {items.length ? items.slice(0, 6).map((item) => <div key={item.name}><span>{item.name}</span><strong>{money(item.amountCents)}</strong></div>) : <p>Nenhum recebimento registrado.</p>}
    </article>
  );
}
