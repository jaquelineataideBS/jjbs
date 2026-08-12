"use client";

/* eslint-disable react-hooks/set-state-in-effect -- carregamentos autenticados atualizam o estado após respostas assíncronas. */

import Link from "next/link";
import { FormEvent, useEffect, useState } from "react";
import CategoryManagement from "./category-management";
import ClientManagement from "./client-management";
import CommunicationManagement from "./communication-management";
import FinanceManagement from "./finance-management";
import MarketingManagement from "./marketing-management";
import PortfolioManagement from "./portfolio-management";
import ReviewsManagement from "./reviews-management";
import SettingsManagement from "./settings-management";
import UsersManagement from "./users-management";
import type { Permission } from "../../lib/permissions";
import { formatWhatsapp } from "../../lib/masks";

type Appointment = {
  id: string;
  appointmentDate: string;
  startTime: string;
  endTime: string;
  status: string;
  totalEstimatedCents: number | null;
  clientName: string;
  clientPhone: string;
  serviceName: string | null;
};
type Client = {
  id: string;
  name: string;
  phone: string;
  email: string | null;
  createdAt: string;
};
type Category = { id: string; name: string };
type Service = {
  id: string;
  categoryId: string | null;
  categoryName: string | null;
  name: string;
  description: string;
  durationMinutes: number;
  priceType: string;
  priceCents: number | null;
  active: boolean;
};
type Overview = {
  admin: { id: string; name: string; role: string; permissions: Permission[] };
  today: string;
  stats: {
    todayCount: number;
    pendingCount: number;
    clientsCount: number;
    estimatedCents: number;
  };
  appointments: Appointment[];
  clients: Client[];
  services: Service[];
  categories: Category[];
};
type ServiceForm = {
  id?: string;
  categoryId: string;
  name: string;
  description: string;
  durationMinutes: string;
  priceType: string;
  price: string;
  active: boolean;
};
type Professional = {
  id: string;
  name: string;
  title: string | null;
  phone: string | null;
  active: boolean;
};
type Hours = {
  id?: string;
  professionalId?: string;
  weekday: number;
  startTime: string;
  endTime: string;
  breakStart: string | null;
  breakEnd: string | null;
  active: boolean;
};
type WorkPeriod = {
  id: string;
  startTime: string;
  endTime: string;
};
type DayHours = {
  weekday: number;
  periods: WorkPeriod[];
};
type Block = {
  id: string;
  professionalId: string;
  blockDate: string;
  startTime: string;
  endTime: string;
  reason: string | null;
};
type ScheduleData = {
  professionals: Professional[];
  services: Array<{ id: string; name: string; active: boolean }>;
  hours: Hours[];
  blocks: Block[];
  relations: Array<{ professionalId: string; serviceId: string }>;
};
type ProfessionalForm = {
  id?: string;
  name: string;
  title: string;
  phone: string;
  active: boolean;
  serviceIds: string[];
};
type BlockForm = {
  blockDate: string;
  startTime: string;
  endTime: string;
  reason: string;
};

const emptyService: ServiceForm = {
  categoryId: "",
  name: "",
  description: "",
  durationMinutes: "60",
  priceType: "fixed",
  price: "",
  active: true,
};
const emptyProfessional: ProfessionalForm = {
  name: "",
  title: "",
  phone: "",
  active: true,
  serviceIds: [],
};
const blankPeriod = (id: string): WorkPeriod => ({ id, startTime: "", endTime: "" });
const defaultHours = (): DayHours[] =>
  Array.from({ length: 7 }, (_, weekday) => ({ weekday, periods: [blankPeriod(`${weekday}-new`)] }));

function editableHours(configured: Hours[]): DayHours[] {
  return Array.from({ length: 7 }, (_, weekday) => {
    const periods = configured
      .filter((hour) => hour.weekday === weekday && hour.active)
      .sort((first, second) => first.startTime.localeCompare(second.startTime))
      .flatMap((hour, index): WorkPeriod[] => {
        const baseId = hour.id ?? `${weekday}-${hour.startTime}-${hour.endTime}-${index}`;
        if (hour.breakStart && hour.breakEnd && hour.startTime < hour.breakStart && hour.breakEnd < hour.endTime) {
          return [
            { id: `${baseId}-before`, startTime: hour.startTime, endTime: hour.breakStart },
            { id: `${baseId}-after`, startTime: hour.breakEnd, endTime: hour.endTime },
          ];
        }
        return [{ id: baseId, startTime: hour.startTime, endTime: hour.endTime }];
      });
    return { weekday, periods: [...periods, blankPeriod(`${weekday}-new`)] };
  });
}
const weekdays = [
  "Domingo",
  "Segunda",
  "Terça",
  "Quarta",
  "Quinta",
  "Sexta",
  "Sábado",
];
const statuses = [
  ["pending_confirmation", "Aguardando confirmação"],
  ["confirmed", "Confirmado"],
  ["in_service", "Em atendimento"],
  ["completed", "Concluído"],
  ["cancelled_by_client", "Cancelado pela cliente"],
  ["cancelled_by_salon", "Cancelado pelo studio"],
  ["no_show", "Não compareceu"],
  ["rescheduled", "Reagendado"],
] as const;

function money(cents: number | null) {
  return cents === null
    ? "Sob consulta"
    : new Intl.NumberFormat("pt-BR", {
        style: "currency",
        currency: "BRL",
      }).format(cents / 100);
}
function responseMessage(result: unknown, fallback: string) {
  return typeof result === "object" &&
    result &&
    "message" in result &&
    typeof result.message === "string"
    ? result.message
    : fallback;
}

export default function AdminPage() {
  const [theme, setTheme] = useState<"dark" | "light">("dark");
  const [data, setData] = useState<Overview | null>(null);
  const [schedule, setSchedule] = useState<ScheduleData | null>(null);
  const [tab, setTab] = useState<
    "agenda" | "schedule" | "services" | "clients" | "portfolio" | "finance" | "marketing" | "communication" | "reviews" | "settings" | "users"
  >("agenda");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState(false);
  const [serviceForm, setServiceForm] = useState<ServiceForm>(emptyService);
  const [professionalForm, setProfessionalForm] =
    useState<ProfessionalForm>(emptyProfessional);
  const [selectedProfessionalId, setSelectedProfessionalId] = useState("");
  const [hoursForm, setHoursForm] = useState<DayHours[]>(defaultHours());
  const [blockForm, setBlockForm] = useState<BlockForm>({
    blockDate: "",
    startTime: "09:00",
    endTime: "10:00",
    reason: "",
  });

  async function request(url: string, options?: RequestInit) {
    const response = await fetch(url, { cache: "no-store", ...options });
    const result = await response.json().catch(() => ({}));
    if (!response.ok)
      throw new Error(
        responseMessage(result, "Não foi possível concluir a operação."),
      );
    return result;
  }
  async function load() {
    setLoading(true);
    try {
      setData((await request("/api/admin/overview")) as Overview);
      setError(false);
    } catch (cause) {
      setError(true);
      setMessage(
        cause instanceof Error
          ? cause.message
          : "Não foi possível carregar o painel.",
      );
    } finally {
      setLoading(false);
    }
  }
  async function loadSchedule() {
    try {
      const next = (await request("/api/admin/schedule")) as ScheduleData;
      setSchedule(next);
      setSelectedProfessionalId((current) =>
        next.professionals.some((professional) => professional.id === current)
          ? current
          : (next.professionals[0]?.id ?? ""),
      );
    } catch (cause) {
      setError(true);
      setMessage(
        cause instanceof Error
          ? cause.message
          : "Não foi possível carregar a agenda.",
      );
    }
  }
  useEffect(() => {
    const savedTheme = window.localStorage.getItem("jaqueline-admin-theme");
    if (savedTheme === "light" || savedTheme === "dark") setTheme(savedTheme);
  }, []);
  useEffect(() => {
    void load();
  }, []);
  useEffect(() => {
    if (tab === "schedule" && data) void loadSchedule();
  }, [tab, data]);
  useEffect(() => {
    if (!schedule || !selectedProfessionalId) return;
    const configured = schedule.hours.filter(
      (hour) => hour.professionalId === selectedProfessionalId,
    );
    setHoursForm(editableHours(configured));
  }, [schedule, selectedProfessionalId]);

  const selectedProfessional =
    schedule?.professionals.find(
      (item) => item.id === selectedProfessionalId,
    ) ?? null;
  const can = (permission: Permission) => Boolean(data?.admin.permissions.includes(permission));
  const agenda = data?.appointments ?? [];
  function note(value: string, isError = false) {
    setMessage(value);
    setError(isError);
  }
  async function updateStatus(id: string, status: string) {
    setSaving(true);
    try {
      await request("/api/admin/appointments", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, status }),
      });
      note("Status atualizado.");
      await load();
    } catch (cause) {
      note(
        cause instanceof Error
          ? cause.message
          : "Não foi possível atualizar o status.",
        true,
      );
    } finally {
      setSaving(false);
    }
  }
  function editService(service: Service) {
    setServiceForm({
      id: service.id,
      categoryId: service.categoryId ?? "",
      name: service.name,
      description: service.description,
      durationMinutes: String(service.durationMinutes),
      priceType: service.priceType,
      price:
        service.priceCents === null ? "" : String(service.priceCents / 100),
      active: service.active,
    });
    setTab("services");
  }
  async function saveService(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    try {
      const priceCents =
        serviceForm.priceType === "consultation"
          ? null
          : Math.round(Number(serviceForm.price.replace(",", ".")) * 100);
      await request("/api/admin/services", {
        method: serviceForm.id ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: serviceForm.id,
          categoryId: serviceForm.categoryId || null,
          name: serviceForm.name,
          description: serviceForm.description,
          durationMinutes: Number(serviceForm.durationMinutes),
          priceType: serviceForm.priceType,
          priceCents,
          active: serviceForm.active,
        }),
      });
      setServiceForm(emptyService);
      note("Serviço salvo com sucesso.");
      await load();
    } catch (cause) {
      note(
        cause instanceof Error
          ? cause.message
          : "Não foi possível salvar o serviço.",
        true,
      );
    } finally {
      setSaving(false);
    }
  }
  function editProfessional(professional: Professional) {
    setSelectedProfessionalId(professional.id);
    setProfessionalForm({
      id: professional.id,
      name: professional.name,
      title: professional.title ?? "",
      phone: formatWhatsapp(professional.phone ?? ""),
      active: professional.active,
      serviceIds:
        schedule?.relations
          .filter((item) => item.professionalId === professional.id)
          .map((item) => item.serviceId) ?? [],
    });
  }
  async function saveProfessional(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    try {
      await request("/api/admin/schedule", {
        method: professionalForm.id ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...(professionalForm.id
            ? professionalForm
            : { ...professionalForm, action: "professional" }),
        }),
      });
      setProfessionalForm(emptyProfessional);
      note("Profissional salva com sucesso.");
      await loadSchedule();
    } catch (cause) {
      note(
        cause instanceof Error
          ? cause.message
          : "Não foi possível salvar a profissional.",
        true,
      );
    } finally {
      setSaving(false);
    }
  }
  async function saveHours(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selectedProfessionalId) return;
    if (hoursForm.some((day) => day.periods.some((period) => Boolean(period.startTime) !== Boolean(period.endTime)))) {
      note("Complete a entrada e a saída de cada horário ou remova o período incompleto.", true);
      return;
    }
    setSaving(true);
    try {
      await request("/api/admin/schedule", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "hours",
          professionalId: selectedProfessionalId,
          hours: hoursForm.flatMap((day) => day.periods
            .filter((period) => period.startTime && period.endTime)
            .map((period) => ({ weekday: day.weekday, startTime: period.startTime, endTime: period.endTime }))),
        }),
      });
      note("Horários de funcionamento atualizados.");
      await loadSchedule();
    } catch (cause) {
      note(
        cause instanceof Error
          ? cause.message
          : "Não foi possível salvar os horários.",
        true,
      );
    } finally {
      setSaving(false);
    }
  }
  function updateWorkPeriod(weekday: number, periodId: string, field: "startTime" | "endTime", value: string) {
    setHoursForm((current) => current.map((day) => {
      if (day.weekday !== weekday) return day;
      const periods = day.periods.map((period) => period.id === periodId ? { ...period, [field]: value } : period);
      const lastPeriod = periods.at(-1);
      if (lastPeriod?.startTime && lastPeriod.endTime) {
        periods.push(blankPeriod(`${weekday}-${Date.now()}`));
      }
      return { ...day, periods };
    }));
  }
  function removeWorkPeriod(weekday: number, periodId: string) {
    setHoursForm((current) => current.map((day) => {
      if (day.weekday !== weekday) return day;
      const periods = day.periods.filter((period) => period.id !== periodId);
      const lastPeriod = periods.at(-1);
      return {
        ...day,
        periods: !lastPeriod || lastPeriod.startTime || lastPeriod.endTime
          ? [...periods, blankPeriod(`${weekday}-${Date.now()}`)]
          : periods,
      };
    }));
  }
  async function saveBlock(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selectedProfessionalId) return;
    setSaving(true);
    try {
      await request("/api/admin/schedule", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "block",
          professionalId: selectedProfessionalId,
          ...blockForm,
        }),
      });
      setBlockForm({
        blockDate: "",
        startTime: "09:00",
        endTime: "10:00",
        reason: "",
      });
      note("Horário bloqueado.");
      await loadSchedule();
    } catch (cause) {
      note(
        cause instanceof Error
          ? cause.message
          : "Não foi possível criar o bloqueio.",
        true,
      );
    } finally {
      setSaving(false);
    }
  }
  async function removeBlock(id: string) {
    setSaving(true);
    try {
      await request("/api/admin/schedule", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      });
      note("Bloqueio removido.");
      await loadSchedule();
    } catch (cause) {
      note(
        cause instanceof Error
          ? cause.message
          : "Não foi possível remover o bloqueio.",
        true,
      );
    } finally {
      setSaving(false);
    }
  }
  function toggleService(id: string) {
    setProfessionalForm((current) => ({
      ...current,
      serviceIds: current.serviceIds.includes(id)
        ? current.serviceIds.filter((serviceId) => serviceId !== id)
        : [...current.serviceIds, id],
    }));
  }

  return (
    <main className="admin-page" data-theme={theme}>
      <header className="site-header">
        <Link
          className="brand"
          href="/"
          aria-label="Jaqueline Justino Beauty Studio - início"
        >
          <span className="brand-symbol" aria-hidden="true">
            <img src="/jaqueline-justino-monogram.png?v=1" alt="" />
          </span>
          <span className="brand-name">
            <strong>Jaqueline Justino</strong>
            <small>Beauty Studio</small>
          </span>
        </Link>
        <nav className="main-nav" aria-label="Navegação principal">
          <Link href="/">Site</Link>
          <Link href="/agendar">Agendamentos</Link>
          <Link href="/minha-conta">Minha conta</Link>
        </nav>
        <div className="admin-header-actions">
          <span className="booking-header-label">Área administrativa</span>
          <button
            className="admin-theme-toggle"
            type="button"
            aria-label={`Ativar tema ${theme === "dark" ? "claro" : "escuro"}`}
            aria-pressed={theme === "light"}
            onClick={() => {
              const nextTheme = theme === "dark" ? "light" : "dark";
              setTheme(nextTheme);
              window.localStorage.setItem("jaqueline-admin-theme", nextTheme);
            }}
          >
            <span aria-hidden="true">{theme === "dark" ? "☀" : "☾"}</span>
            {theme === "dark" ? "Claro" : "Escuro"}
          </button>
        </div>
      </header>
      <section className="admin-shell">
        <div className="admin-heading">
          <div>
            <p className="eyebrow">
              Gestão do studio <span>✦</span>
            </p>
            <h1>
              Agenda e <em>operação.</em>
            </h1>
            <p>
              Organize atendimentos, profissionais, horários e clientes com
              segurança.
            </p>
          </div>
          <button
            className="text-button"
            type="button"
            onClick={() => {
              void load();
              if (tab === "schedule") void loadSchedule();
            }}
            disabled={loading || saving}
          >
            Atualizar dados
          </button>
        </div>
        {message && (
          <p
            className={`admin-feedback ${error ? "error" : ""}`}
            role={error ? "alert" : "status"}
          >
            {message}
          </p>
        )}
        {loading ? (
          <p className="admin-loading">Carregando informações do studio…</p>
        ) : !data ? (
          <div className="admin-empty">
            <h2>Acesso administrativo necessário.</h2>
            <p>
              Entre com uma conta marcada como administradora para visualizar os
              dados.
            </p>
          </div>
        ) : (
          <>
            <section className="admin-stats" aria-label="Resumo do studio">
              <article>
                <span>Agenda de hoje</span>
                <strong>{data.stats.todayCount}</strong>
                <small>{data.today.split("-").reverse().join("/")}</small>
              </article>
              <article>
                <span>Aguardando confirmação</span>
                <strong>{data.stats.pendingCount}</strong>
                <small>próximos atendimentos</small>
              </article>
              <article>
                <span>Clientes cadastrados</span>
                <strong>{data.stats.clientsCount}</strong>
                <small>base exibida no painel</small>
              </article>
              {can("finance") && <article>
                <span>Estimativa de hoje</span>
                <strong>{money(data.stats.estimatedCents)}</strong>
                <small>sem descontos aplicados</small>
              </article>}
            </section>
            <div
              className="admin-tabs"
              role="tablist"
              aria-label="Módulos administrativos"
            >
              <button
                className={tab === "agenda" ? "active" : ""}
                type="button"
                onClick={() => setTab("agenda")}
              >
                Agenda
              </button>
              <button
                className={tab === "schedule" ? "active" : ""}
                hidden={!can("schedule")}
                type="button"
                onClick={() => setTab("schedule")}
              >
                Configurar agenda
              </button>
              <button
                className={tab === "services" ? "active" : ""}
                hidden={!can("services")}
                type="button"
                onClick={() => setTab("services")}
              >
                Serviços
              </button>
              <button
                className={tab === "clients" ? "active" : ""}
                hidden={!can("clients")}
                type="button"
                onClick={() => setTab("clients")}
              >
                Clientes
              </button>
              <button
                className={tab === "portfolio" ? "active" : ""}
                hidden={!can("portfolio")}
                type="button"
                onClick={() => setTab("portfolio")}
              >
                Galeria
              </button>
              <button
                className={tab === "finance" ? "active" : ""}
                hidden={!can("finance")}
                type="button"
                onClick={() => setTab("finance")}
              >
                Financeiro
              </button>
              <button
                className={tab === "marketing" ? "active" : ""}
                hidden={!can("marketing")}
                type="button"
                onClick={() => setTab("marketing")}
              >
                Promoções e fidelidade
              </button>
              <button className={tab === "communication" ? "active" : ""} hidden={!can("communication")} type="button" onClick={() => setTab("communication")}>Comunicação</button>
              <button className={tab === "reviews" ? "active" : ""} hidden={!can("reviews")} type="button" onClick={() => setTab("reviews")}>Avaliações</button>
              <button className={tab === "settings" ? "active" : ""} hidden={!can("settings")} type="button" onClick={() => setTab("settings")}>Configurações</button>
              <button className={tab === "users" ? "active" : ""} hidden={!can("users")} type="button" onClick={() => setTab("users")}>Usuários</button>
            </div>
            {tab === "agenda" && (
              <section className="admin-panel">
                <div className="admin-panel-heading">
                  <div>
                    <span>Próximos atendimentos</span>
                    <h2>Agenda do studio</h2>
                  </div>
                  <p>Status atualizados diretamente no banco.</p>
                </div>
                {agenda.length ? (
                  <div className="admin-table-wrap">
                    <table>
                      <thead>
                        <tr>
                          <th>Data e hora</th>
                          <th>Cliente</th>
                          <th>Serviço</th>
                          <th>Valor</th>
                          <th>Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        {agenda.map((appointment) => (
                          <tr key={appointment.id}>
                            <td>
                              <strong>
                                {appointment.appointmentDate
                                  .split("-")
                                  .reverse()
                                  .join("/")}
                              </strong>
                              <small>
                                {appointment.startTime}–{appointment.endTime}
                              </small>
                            </td>
                            <td>
                              <strong>{appointment.clientName}</strong>
                              <small>{appointment.clientPhone}</small>
                            </td>
                            <td>
                              {appointment.serviceName ??
                                "Serviço não identificado"}
                            </td>
                            <td>{money(appointment.totalEstimatedCents)}</td>
                            <td>
                              <label className="admin-status">
                                <span className="sr-only">
                                  Status de {appointment.clientName}
                                </span>
                                <select
                                  value={appointment.status}
                                  disabled={saving}
                                  onChange={(event) =>
                                    void updateStatus(
                                      appointment.id,
                                      event.target.value,
                                    )
                                  }
                                >
                                  {statuses.map(([value, label]) => (
                                    <option value={value} key={value}>
                                      {label}
                                    </option>
                                  ))}
                                </select>
                              </label>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className="admin-empty">
                    <h2>Nenhum agendamento futuro.</h2>
                    <p>
                      Os novos agendamentos aparecerão aqui automaticamente.
                    </p>
                  </div>
                )}
              </section>
            )}
            {tab === "schedule" && (
              <section className="admin-schedule-layout">
                <form
                  className="admin-service-form"
                  onSubmit={saveProfessional}
                >
                  <div className="admin-panel-heading">
                    <div>
                      <span>
                        {professionalForm.id
                          ? "Editar profissional"
                          : "Nova profissional"}
                      </span>
                      <h2>Equipe do studio</h2>
                    </div>
                    {professionalForm.id && (
                      <button
                        className="text-button"
                        type="button"
                        onClick={() => setProfessionalForm(emptyProfessional)}
                      >
                        Novo cadastro
                      </button>
                    )}
                  </div>
                  <label>
                    Nome
                    <input
                      value={professionalForm.name}
                      onChange={(event) =>
                        setProfessionalForm((current) => ({
                          ...current,
                          name: event.target.value,
                        }))
                      }
                      required
                      maxLength={120}
                    />
                  </label>
                  <label>
                    Função / apresentação
                    <input
                      value={professionalForm.title}
                      onChange={(event) =>
                        setProfessionalForm((current) => ({
                          ...current,
                          title: event.target.value,
                        }))
                      }
                      maxLength={120}
                      placeholder="Ex.: hairstylist"
                    />
                  </label>
                  <label>
                    WhatsApp
                    <input
                      value={professionalForm.phone}
                      onChange={(event) =>
                        setProfessionalForm((current) => ({
                          ...current,
                          phone: formatWhatsapp(event.target.value),
                        }))
                      }
                      autoComplete="tel"
                      inputMode="tel"
                      maxLength={15}
                      placeholder="(85) 99999-0000"
                    />
                  </label>
                  <fieldset className="admin-service-checks">
                    <legend>Serviços atendidos</legend>
                    {schedule?.services
                      .filter((service) => service.active)
                      .map((service) => (
                        <label key={service.id}>
                          <input
                            type="checkbox"
                            checked={professionalForm.serviceIds.includes(
                              service.id,
                            )}
                            onChange={() => toggleService(service.id)}
                          />{" "}
                          {service.name}
                        </label>
                      ))}
                  </fieldset>
                  <label className="admin-toggle">
                    <input
                      type="checkbox"
                      checked={professionalForm.active}
                      onChange={(event) =>
                        setProfessionalForm((current) => ({
                          ...current,
                          active: event.target.checked,
                        }))
                      }
                    />{" "}
                    Disponível para agendamento
                  </label>
                  <button
                    className="button button-gold"
                    type="submit"
                    disabled={saving}
                  >
                    {professionalForm.id
                      ? "Salvar profissional"
                      : "Adicionar profissional"}
                    <span>↗</span>
                  </button>
                </form>
                <div className="admin-schedule-stack">
                  <section className="admin-panel">
                    <div className="admin-panel-heading">
                      <div>
                        <span>Profissionais</span>
                        <h2>Quem atende</h2>
                      </div>
                      <p>
                        Selecione uma profissional para configurar o expediente.
                      </p>
                    </div>
                    <div className="admin-professional-list">
                      {schedule?.professionals.map((professional) => (
                        <article
                          className={
                            professional.id === selectedProfessionalId
                              ? "selected"
                              : ""
                          }
                          key={professional.id}
                        >
                          <button
                            type="button"
                            onClick={() => {
                              setSelectedProfessionalId(professional.id);
                              editProfessional(professional);
                            }}
                          >
                            <strong>{professional.name}</strong>
                            <small>
                              {professional.title ?? "Profissional do studio"} ·{" "}
                              {professional.active ? "ativa" : "inativa"}
                            </small>
                          </button>
                          <button
                            className="text-button"
                            type="button"
                            onClick={() => editProfessional(professional)}
                          >
                            Editar
                          </button>
                        </article>
                      ))}
                    </div>
                  </section>
                  {selectedProfessional && (
                    <>
                      <form
                        className="admin-panel admin-hours-form"
                        onSubmit={saveHours}
                      >
                        <div className="admin-panel-heading">
                          <div>
                            <span>Expediente</span>
                            <h2>
                              Horários de{" "}
                              {selectedProfessional.name.split(" ")[0]}
                            </h2>
                          </div>
                          <p>
                            Escreva a entrada e a saída. Ao completar um período,
                            outro campo aparece para você acrescentar mais um horário.
                          </p>
                        </div>
                        <div className="admin-hours-list">
                          {hoursForm.map((day) => (
                            <section className="admin-hours-day" key={day.weekday}>
                              <div className="admin-hours-day-heading">
                                <strong>{weekdays[day.weekday]}</strong>
                                <small>{day.periods.some((period) => period.startTime && period.endTime) ? "Dia com atendimento" : "Folga"}</small>
                              </div>
                              <div className="admin-hours-periods">
                                {day.periods.map((period, index) => (
                                  <div className="admin-hours-period" key={period.id}>
                                    <label>
                                      <span>Entrada</span>
                                      <input
                                        type="time"
                                        value={period.startTime}
                                        aria-label={`Entrada ${index + 1} de ${weekdays[day.weekday]}`}
                                        onChange={(event) => updateWorkPeriod(day.weekday, period.id, "startTime", event.target.value)}
                                      />
                                    </label>
                                    <span className="admin-hours-separator">até</span>
                                    <label>
                                      <span>Saída</span>
                                      <input
                                        type="time"
                                        value={period.endTime}
                                        aria-label={`Saída ${index + 1} de ${weekdays[day.weekday]}`}
                                        onChange={(event) => updateWorkPeriod(day.weekday, period.id, "endTime", event.target.value)}
                                      />
                                    </label>
                                    {(period.startTime || period.endTime) && day.periods.length > 1 && (
                                      <button className="admin-hours-remove" type="button" onClick={() => removeWorkPeriod(day.weekday, period.id)} aria-label={`Remover horário ${index + 1} de ${weekdays[day.weekday]}`}>Remover</button>
                                    )}
                                  </div>
                                ))}
                              </div>
                              <p>Preencha entrada e saída. Um novo horário aparecerá automaticamente.</p>
                            </section>
                          ))}
                        </div>
                        <button
                          className="button button-gold"
                          type="submit"
                          disabled={saving}
                        >
                          Salvar expediente <span>↗</span>
                        </button>
                      </form>
                      <section className="admin-schedule-blocks">
                        <form
                          className="admin-service-form"
                          onSubmit={saveBlock}
                        >
                          <div className="admin-panel-heading">
                            <div>
                              <span>Bloqueio pontual</span>
                              <h2>Fechar um horário</h2>
                            </div>
                          </div>
                          <div className="admin-form-grid">
                            <label>
                              Data
                              <input
                                type="date"
                                value={blockForm.blockDate}
                                onChange={(event) =>
                                  setBlockForm((current) => ({
                                    ...current,
                                    blockDate: event.target.value,
                                  }))
                                }
                                required
                              />
                            </label>
                            <label>
                              Motivo
                              <input
                                value={blockForm.reason}
                                onChange={(event) =>
                                  setBlockForm((current) => ({
                                    ...current,
                                    reason: event.target.value,
                                  }))
                                }
                                maxLength={240}
                                placeholder="Ex.: compromisso"
                              />
                            </label>
                            <label>
                              Início
                              <input
                                type="time"
                                value={blockForm.startTime}
                                onChange={(event) =>
                                  setBlockForm((current) => ({
                                    ...current,
                                    startTime: event.target.value,
                                  }))
                                }
                                required
                              />
                            </label>
                            <label>
                              Fim
                              <input
                                type="time"
                                value={blockForm.endTime}
                                onChange={(event) =>
                                  setBlockForm((current) => ({
                                    ...current,
                                    endTime: event.target.value,
                                  }))
                                }
                                required
                              />
                            </label>
                          </div>
                          <button
                            className="button button-gold"
                            type="submit"
                            disabled={saving}
                          >
                            Bloquear horário <span>↗</span>
                          </button>
                        </form>
                        <section className="admin-panel">
                          <div className="admin-panel-heading">
                            <div>
                              <span>Próximos bloqueios</span>
                              <h2>Indisponibilidades</h2>
                            </div>
                          </div>
                          <div className="admin-professional-list">
                            {schedule?.blocks
                              .filter(
                                (block) =>
                                  block.professionalId ===
                                  selectedProfessionalId,
                              )
                              .map((block) => (
                                <article key={block.id}>
                                  <div>
                                    <strong>
                                      {block.blockDate
                                        .split("-")
                                        .reverse()
                                        .join("/")}{" "}
                                      · {block.startTime}–{block.endTime}
                                    </strong>
                                    <small>
                                      {block.reason ?? "Sem motivo informado"}
                                    </small>
                                  </div>
                                  <button
                                    className="text-button"
                                    type="button"
                                    disabled={saving}
                                    onClick={() => void removeBlock(block.id)}
                                  >
                                    Remover
                                  </button>
                                </article>
                              )) ?? <p>Nenhum bloqueio futuro.</p>}
                          </div>
                        </section>
                      </section>
                    </>
                  )}
                </div>
              </section>
            )}
            {tab === "services" && (
              <section className="admin-services-layout">
                <div className="admin-service-stack">
                  <CategoryManagement onChanged={() => void load()} />
                <form className="admin-service-form" onSubmit={saveService}>
                  <div className="admin-panel-heading">
                    <div>
                      <span>
                        {serviceForm.id ? "Editar serviço" : "Novo serviço"}
                      </span>
                      <h2>
                        {serviceForm.id
                          ? "Atualize os detalhes."
                          : "Cadastre um serviço."}
                      </h2>
                    </div>
                    {serviceForm.id && (
                      <button
                        className="text-button"
                        type="button"
                        onClick={() => setServiceForm(emptyService)}
                      >
                        Novo cadastro
                      </button>
                    )}
                  </div>
                  <label>
                    Nome do serviço
                    <input
                      value={serviceForm.name}
                      onChange={(event) =>
                        setServiceForm((current) => ({
                          ...current,
                          name: event.target.value,
                        }))
                      }
                      required
                      maxLength={120}
                    />
                  </label>
                  <label>
                    Categoria
                    <select
                      value={serviceForm.categoryId}
                      onChange={(event) =>
                        setServiceForm((current) => ({
                          ...current,
                          categoryId: event.target.value,
                        }))
                      }
                    >
                      <option value="">Sem categoria</option>
                      {data.categories.map((category) => (
                        <option value={category.id} key={category.id}>
                          {category.name}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label>
                    Descrição
                    <textarea
                      value={serviceForm.description}
                      onChange={(event) =>
                        setServiceForm((current) => ({
                          ...current,
                          description: event.target.value,
                        }))
                      }
                      required
                      maxLength={1000}
                      rows={4}
                    />
                  </label>
                  <div className="admin-form-grid">
                    <label>
                      Duração (minutos)
                      <input
                        type="number"
                        min="15"
                        max="720"
                        step="15"
                        value={serviceForm.durationMinutes}
                        onChange={(event) =>
                          setServiceForm((current) => ({
                            ...current,
                            durationMinutes: event.target.value,
                          }))
                        }
                        required
                      />
                    </label>
                    <label>
                      Tipo de preço
                      <select
                        value={serviceForm.priceType}
                        onChange={(event) =>
                          setServiceForm((current) => ({
                            ...current,
                            priceType: event.target.value,
                            price:
                              event.target.value === "consultation"
                                ? ""
                                : current.price,
                          }))
                        }
                      >
                        <option value="fixed">Valor fixo</option>
                        <option value="starting_at">A partir de</option>
                        <option value="consultation">Sob consulta</option>
                      </select>
                    </label>
                  </div>
                  {serviceForm.priceType !== "consultation" && (
                    <label>
                      Valor (R$)
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        value={serviceForm.price}
                        onChange={(event) =>
                          setServiceForm((current) => ({
                            ...current,
                            price: event.target.value,
                          }))
                        }
                        required
                      />
                    </label>
                  )}
                  <label className="admin-toggle">
                    <input
                      type="checkbox"
                      checked={serviceForm.active}
                      onChange={(event) =>
                        setServiceForm((current) => ({
                          ...current,
                          active: event.target.checked,
                        }))
                      }
                    />{" "}
                    Serviço disponível para agendamento
                  </label>
                  <button
                    className="button button-gold"
                    type="submit"
                    disabled={saving}
                  >
                    {serviceForm.id ? "Salvar alterações" : "Cadastrar serviço"}
                    <span>↗</span>
                  </button>
                </form>
                </div>
                <section className="admin-panel">
                  <div className="admin-panel-heading">
                    <div>
                      <span>Catálogo atual</span>
                      <h2>Serviços disponíveis</h2>
                    </div>
                    <p>{data.services.length} cadastrados</p>
                  </div>
                  <div className="admin-service-list">
                    {data.services.map((service) => (
                      <article key={service.id}>
                        <div>
                          <span>{service.categoryName ?? "Sem categoria"}</span>
                          <h3>{service.name}</h3>
                          <p>{service.description}</p>
                        </div>
                        <div>
                          <strong>
                            {service.priceType === "starting_at"
                              ? "A partir de "
                              : ""}
                            {money(service.priceCents)}
                          </strong>
                          <small>
                            {service.durationMinutes} minutos ·{" "}
                            {service.active ? "ativo" : "inativo"}
                          </small>
                          <button
                            className="text-button"
                            type="button"
                            onClick={() => editService(service)}
                          >
                            Editar
                          </button>
                        </div>
                      </article>
                    ))}
                  </div>
                </section>
              </section>
            )}
            {tab === "clients" && <ClientManagement />}
            {tab === "portfolio" && <PortfolioManagement />}
            {tab === "finance" && <FinanceManagement />}
            {tab === "marketing" && <MarketingManagement />}
            {tab === "communication" && <CommunicationManagement />}
            {tab === "reviews" && <ReviewsManagement />}
            {tab === "settings" && <SettingsManagement />}
            {tab === "users" && <UsersManagement />}
          </>
        )}
      </section>
    </main>
  );
}
