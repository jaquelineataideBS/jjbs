"use client";

/* eslint-disable react-hooks/set-state-in-effect -- carregamentos autenticados atualizam o estado após respostas assíncronas. */

import Link from "next/link";
import { revealEditor } from "../../lib/editor-navigation";
import { FormEvent, Fragment, useEffect, useState } from "react";
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
import { formatDurationInHours } from "../../lib/scheduling";
import { hairSizes, priceForHairSize, type HairSize, type HairSizePrices } from "../../lib/hair-sizes";
import { PublicBrand } from "../public-settings";
import PushNotificationsControl from "../push-notifications-control";
import OpenDatesCalendar from "./open-dates-calendar";
import CalendarMonths from "../calendar-months";

type Appointment = {
  id: string;
  professionalId: string;
  serviceId: string | null;
  appointmentDate: string;
  startTime: string;
  hairSize: HairSize | null;
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
  sizePrices: HairSizePrices;
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
  durationHours: string;
  priceType: string;
  sizePrices: Record<HairSize, string>;
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
type ScheduleData = {
  professionals: Professional[];
  services: Array<{ id: string; name: string; active: boolean }>;
  hours: Hours[];
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

const emptyService: ServiceForm = {
  categoryId: "",
  name: "",
  description: "",
  durationHours: "1",
  priceType: "fixed",
  sizePrices: { P: "", M: "", G: "", EX: "" },
  active: true,
};
const emptyProfessional: ProfessionalForm = {
  name: "",
  title: "",
  phone: "",
  active: true,
  serviceIds: [],
};
const blankPeriod = (id: string): WorkPeriod => ({
  id,
  startTime: "",
  endTime: "",
});
const defaultHours = (): DayHours[] =>
  Array.from({ length: 7 }, (_, weekday) => ({
    weekday,
    periods: [blankPeriod(`${weekday}-new`)],
  }));

function editableHours(configured: Hours[]): DayHours[] {
  return Array.from({ length: 7 }, (_, weekday) => {
    const periods = configured
      .filter((hour) => hour.weekday === weekday && hour.active)
      .sort((first, second) => first.startTime.localeCompare(second.startTime))
      .flatMap((hour, index): WorkPeriod[] => {
        const baseId =
          hour.id ?? `${weekday}-${hour.startTime}-${hour.endTime}-${index}`;
        if (
          hour.breakStart &&
          hour.breakEnd &&
          hour.startTime < hour.breakStart &&
          hour.breakEnd < hour.endTime
        ) {
          return [
            {
              id: `${baseId}-before`,
              startTime: hour.startTime,
              endTime: hour.breakStart,
            },
            {
              id: `${baseId}-after`,
              startTime: hour.breakEnd,
              endTime: hour.endTime,
            },
          ];
        }
        return [
          { id: baseId, startTime: hour.startTime, endTime: hour.endTime },
        ];
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
    | "agenda"
    | "schedule"
    | "services"
    | "clients"
    | "portfolio"
    | "finance"
    | "marketing"
    | "communication"
    | "reviews"
    | "settings"
    | "users"
  >("agenda");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState(false);
  const [serviceForm, setServiceForm] = useState<ServiceForm>(emptyService);
  const [professionalForm, setProfessionalForm] =
    useState<ProfessionalForm>(emptyProfessional);
  const [selectedProfessionalId, setSelectedProfessionalId] = useState("");
  const [selectedScheduleDate, setSelectedScheduleDate] = useState<string | null>(null);
  const [reschedulingAppointment, setReschedulingAppointment] = useState<Appointment | null>(null);
  const [editingAppointment, setEditingAppointment] = useState<Appointment | null>(null);
  const [editClientName, setEditClientName] = useState("");
  const [editClientPhone, setEditClientPhone] = useState("");
  const [editAppointmentDate, setEditAppointmentDate] = useState("");
  const [editStartTime, setEditStartTime] = useState("");
  const [editServiceId, setEditServiceId] = useState("");
  const [editHairSize, setEditHairSize] = useState<HairSize | "">("");
  const [editDates, setEditDates] = useState<string[]>([]);
  const [editSlots, setEditSlots] = useState<string[]>([]);
  const [editDatesLoading, setEditDatesLoading] = useState(false);
  const [editSlotsLoading, setEditSlotsLoading] = useState(false);
  const [rescheduleDates, setRescheduleDates] = useState<string[]>([]);
  const [rescheduleDate, setRescheduleDate] = useState("");
  const [rescheduleSlots, setRescheduleSlots] = useState<string[]>([]);
  const [rescheduleTime, setRescheduleTime] = useState("");
  const [rescheduleServices, setRescheduleServices] = useState<Service[]>([]);
  const [rescheduleServiceId, setRescheduleServiceId] = useState("");
  const [rescheduleHairSize, setRescheduleHairSize] = useState<HairSize>("P");
  const [rescheduleServicesLoading, setRescheduleServicesLoading] = useState(false);
  const [rescheduleLoading, setRescheduleLoading] = useState(false);
  const [hoursForm, setHoursForm] = useState<DayHours[]>(defaultHours());
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
  async function logout() {
    setLoggingOut(true);
    setMessage("");
    setError(false);
    try {
      const response = await fetch("/api/auth/logout", {
        method: "POST",
        cache: "no-store",
      });
      if (!response.ok) throw new Error("Não foi possível encerrar a sessão.");
      window.location.replace("/minha-conta");
    } catch (cause) {
      setError(true);
      setMessage(cause instanceof Error ? cause.message : "Não foi possível encerrar a sessão.");
      setLoggingOut(false);
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
    setMessage("");
    setError(false);
  }, [tab]);
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

  useEffect(() => {
    if (!editingAppointment || !editServiceId) {
      setEditDates([]);
      setEditDatesLoading(false);
      return;
    }
    const controller = new AbortController();
    setEditDatesLoading(true);
    // Use the same dates shown by the public homepage calendar. Slot
    // availability is still checked against this appointment's service and
    // professional after the admin selects a day.
    fetch("/api/booking-dates", { cache: "no-store", signal: controller.signal })
      .then(async (response) => {
        const result = await response.json().catch(() => ({}));
        if (!response.ok) throw new Error(result.message ?? "Não foi possível carregar os dias disponíveis.");
        setEditDates(Array.isArray(result.dates) ? result.dates : []);
      })
      .catch((cause: unknown) => {
        if (cause instanceof Error && cause.name !== "AbortError") setEditDates([]);
      })
      .finally(() => {
        if (!controller.signal.aborted) setEditDatesLoading(false);
      });
    return () => controller.abort();
  }, [editingAppointment?.id, editServiceId]);

  useEffect(() => {
    if (!editingAppointment || !editServiceId || !editAppointmentDate) {
      setEditSlots([]);
      setEditSlotsLoading(false);
      return;
    }
    const controller = new AbortController();
    setEditSlotsLoading(true);
    setEditSlots([]);
    const query = new URLSearchParams({
      serviceId: editServiceId,
      professionalId: editingAppointment.professionalId,
      date: editAppointmentDate,
      excludeAppointmentId: editingAppointment.id,
    });
    fetch(`/api/availability?${query}`, { cache: "no-store", signal: controller.signal })
      .then(async (response) => {
        const result = await response.json().catch(() => ({}));
        if (!response.ok) throw new Error(result.message ?? "Não foi possível consultar os horários.");
        const nextSlots = Array.isArray(result.slots) ? result.slots as string[] : [];
        setEditSlots(nextSlots);
        setEditStartTime((current) => nextSlots.includes(current) ? current : "");
      })
      .catch((cause: unknown) => {
        if (cause instanceof Error && cause.name !== "AbortError") setEditSlots([]);
      })
      .finally(() => {
        if (!controller.signal.aborted) setEditSlotsLoading(false);
      });
    return () => controller.abort();
  }, [editingAppointment?.id, editServiceId, editAppointmentDate]);

  const selectedProfessional =
    schedule?.professionals.find(
      (item) => item.id === selectedProfessionalId,
    ) ?? null;
  const can = (permission: Permission) =>
    Boolean(data?.admin.permissions.includes(permission));
  const agenda = data?.appointments ?? [];
  function note(value: string, isError = false) {
    setMessage(value);
    setError(isError);
  }
  async function updateStatus(id: string, status: string, appointmentDate?: string, startTime?: string, serviceId?: string, hairSize?: HairSize) {
    setSaving(true);
    try {
      await request("/api/admin/appointments", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, status, appointmentDate, startTime, serviceId, hairSize }),
      });
      note(appointmentDate && startTime ? `Agendamento reagendado para ${appointmentDate.split("-").reverse().join("/")}, às ${startTime}${serviceId ? `, serviço: ${data?.services.find((service) => service.id === serviceId)?.name ?? "atualizado"}` : ""}.` : "Status atualizado.");
      if (appointmentDate && startTime) setReschedulingAppointment(null);
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
  function beginEditAppointment(appointment: Appointment) {
    setReschedulingAppointment(null);
    setEditingAppointment(appointment);
    setEditClientName(appointment.clientName);
    setEditClientPhone(appointment.clientPhone);
    setEditAppointmentDate(appointment.appointmentDate);
    setEditStartTime(appointment.startTime);
    setEditServiceId(appointment.serviceId ?? "");
    setEditHairSize(appointment.hairSize && hairSizes.includes(appointment.hairSize) ? appointment.hairSize : "");
  }
  async function saveAppointmentEdit(event: FormEvent<HTMLFormElement>, appointment: Appointment) {
    event.preventDefault();
    const scheduleChanged = editAppointmentDate !== appointment.appointmentDate ||
      editStartTime !== appointment.startTime ||
      editServiceId !== (appointment.serviceId ?? "") ||
      editHairSize !== (appointment.hairSize ?? "");
    if (scheduleChanged && !editHairSize) {
      note("Escolha o tamanho do cabelo para atualizar o serviço e o valor.", true);
      return;
    }
    if (scheduleChanged && (!editDates.includes(editAppointmentDate) || !editSlots.includes(editStartTime))) {
      note("Escolha uma data liberada e um horário disponível para este serviço.", true);
      return;
    }
    setSaving(true);
    try {
      await request("/api/admin/appointments", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: appointment.id,
          status: appointment.status,
          clientName: editClientName,
          clientPhone: editClientPhone,
          appointmentDate: editAppointmentDate,
          startTime: editStartTime,
          serviceId: editServiceId,
          hairSize: editHairSize || undefined,
        }),
      });
      setEditingAppointment(null);
      note("Dados do agendamento atualizados.");
      await load();
    } catch (cause) {
      note(cause instanceof Error ? cause.message : "Não foi possível atualizar os dados do agendamento.", true);
    } finally {
      setSaving(false);
    }
  }
  async function beginReschedule(appointment: Appointment) {
    setEditingAppointment(null);
    setReschedulingAppointment(appointment);
    setRescheduleDate("");
    setRescheduleSlots([]);
    setRescheduleTime("");
    setRescheduleServices([]);
    setRescheduleServiceId("");
    setRescheduleHairSize(appointment.hairSize && hairSizes.includes(appointment.hairSize) ? appointment.hairSize : "P");
    setRescheduleLoading(true);
    try {
      // Keep this calendar in sync with the homepage's public agenda.
      const result = await request("/api/booking-dates");
      setRescheduleDates(Array.isArray(result.dates) ? result.dates : []);
    } catch (cause) {
      setRescheduleDates([]);
      note(cause instanceof Error ? cause.message : "Não foi possível carregar a agenda.", true);
    } finally {
      setRescheduleLoading(false);
    }
  }
  async function loadRescheduleSlots(appointment: Appointment, date: string) {
    setRescheduleDate(date);
    setRescheduleSlots([]);
    setRescheduleTime("");
    setRescheduleServices([]);
    setRescheduleServiceId("");
    if (!appointment.serviceId) return note("Este agendamento não tem serviço associado para verificar os horários.", true);
    setRescheduleLoading(true);
    try {
      const query = new URLSearchParams({ serviceId: appointment.serviceId, professionalId: appointment.professionalId, date, excludeAppointmentId: appointment.id });
      const result = await request(`/api/availability?${query}`);
      setRescheduleSlots(Array.isArray(result.slots) ? result.slots : []);
      if (!result.slots?.length) note("Não há horários livres para esta profissional nesse dia.", true);
    } catch (cause) {
      note(cause instanceof Error ? cause.message : "Não foi possível consultar os horários.", true);
    } finally {
      setRescheduleLoading(false);
    }
  }
  async function loadRescheduleServices(appointment: Appointment, date: string, time: string) {
    setRescheduleTime(time);
    setRescheduleServiceId("");
    setRescheduleServices([]);
    setRescheduleServicesLoading(true);
    const options = (data?.services ?? []).filter((service) => service.active);
    try {
      const available = await Promise.all(options.map(async (service) => {
        try {
          const query = new URLSearchParams({
            serviceId: service.id,
            professionalId: appointment.professionalId,
            date,
            time,
            excludeAppointmentId: appointment.id,
          });
          const response = await fetch(`/api/availability?${query}`, { cache: "no-store" });
          const result = await response.json().catch(() => ({}));
          return response.ok &&
            Array.isArray(result.professionals) &&
            result.professionals.some((professional: { id?: string }) => professional.id === appointment.professionalId) &&
            Array.isArray(result.slots) && result.slots.includes(time)
            ? service
            : null;
        } catch {
          return null;
        }
      }));
      setRescheduleServices(available.filter((service): service is Service => service !== null));
    } finally {
      setRescheduleServicesLoading(false);
    }
  }
  function editService(service: Service) {
    revealEditor(".admin-service-editor");
    setServiceForm({
      id: service.id,
      categoryId: service.categoryId ?? "",
      name: service.name,
      description: service.description,
      durationHours: String(Math.round((service.durationMinutes / 60) * 100) / 100),
      priceType: service.priceType,
      sizePrices: Object.fromEntries(hairSizes.map((size) => {
        const price = priceForHairSize(service.sizePrices, size, service.priceCents);
        return [size, price === null ? "" : String(price / 100)];
      })) as Record<HairSize, string>,
      active: service.active,
    });
    setTab("services");
  }
  async function saveService(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    try {
      const sizePrices = Object.fromEntries(hairSizes.map((size) => [
        size,
        serviceForm.priceType === "consultation"
          ? null
          : Math.round(Number(serviceForm.sizePrices[size].replace(",", ".")) * 100),
      ])) as Record<HairSize, number | null>;
      const priceCents = sizePrices.P;
      await request("/api/admin/services", {
        method: serviceForm.id ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: serviceForm.id,
          categoryId: serviceForm.categoryId || null,
          name: serviceForm.name,
          description: serviceForm.description,
          durationMinutes: Math.round(Number(serviceForm.durationHours.replace(",", ".")) * 60),
          priceType: serviceForm.priceType,
          priceCents,
          sizePrices,
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
    revealEditor("form[data-professional-editor]");
    if (professional.id !== selectedProfessionalId) setSelectedScheduleDate(null);
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
  async function deleteProfessional(professional: Professional) {
    const confirmed = window.confirm(
      `Excluir ${professional.name} da equipe? Se houver agendamentos vinculados, o cadastro ficará inativo para preservar o histórico.`,
    );
    if (!confirmed) return;
    setSaving(true);
    try {
      const result = await request("/api/admin/schedule", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: "professional", id: professional.id }),
      });
      if (professionalForm.id === professional.id) setProfessionalForm(emptyProfessional);
      if (selectedProfessionalId === professional.id) setSelectedScheduleDate(null);
      note(result.message ?? "Profissional removida.");
      await loadSchedule();
    } catch (cause) {
      note(cause instanceof Error ? cause.message : "Não foi possível excluir a profissional.", true);
    } finally {
      setSaving(false);
    }
  }
  async function saveHours(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selectedProfessionalId) return;
    setSaving(true);
    try {
      await request("/api/admin/schedule", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "hours",
          professionalId: selectedProfessionalId,
          hours: hoursForm.flatMap((day) =>
            day.periods
              .filter((period) => period.startTime)
              .map((period) => ({
                weekday: day.weekday,
                startTime: period.startTime,
              })),
          ),
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
  function updateWorkPeriod(
    weekday: number,
    periodId: string,
    field: "startTime",
    value: string,
  ) {
    setHoursForm((current) =>
      current.map((day) => {
        if (day.weekday !== weekday) return day;
        const periods = day.periods.map((period) =>
          period.id === periodId ? { ...period, [field]: value } : period,
        );
        const lastPeriod = periods.at(-1);
        if (lastPeriod?.startTime) {
          periods.push(blankPeriod(`${weekday}-${Date.now()}`));
        }
        return { ...day, periods };
      }),
    );
  }
  function removeWorkPeriod(weekday: number, periodId: string) {
    setHoursForm((current) =>
      current.map((day) => {
        if (day.weekday !== weekday) return day;
        const periods = day.periods.filter((period) => period.id !== periodId);
        const lastPeriod = periods.at(-1);
        return {
          ...day,
          periods:
            !lastPeriod || lastPeriod.startTime
              ? [...periods, blankPeriod(`${weekday}-${Date.now()}`)]
              : periods,
        };
      }),
    );
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
        <PublicBrand />
        <nav className="main-nav" aria-label="Navegação principal">
          <Link href="/">Site</Link>
          <Link href="/agendar">Agendamentos</Link>
          <Link href="/minha-conta">Minha conta</Link>
          <Link href="/admin/lgpd">Privacidade</Link>
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
          <button
            className="text-button"
            type="button"
            onClick={() => void logout()}
            disabled={loggingOut}
            aria-label="Sair da conta administrativa"
          >
            {loggingOut ? "Saindo..." : "Sair da conta"}
          </button>
        </div>
      </header>
      <section className="admin-shell">
        {data && <PushNotificationsControl audience="studio" />}
        <div className="admin-heading">
          <div>
            <p className="eyebrow">
              Gestão do studio <span>✦</span>
            </p>
            <h1>{({ agenda: "Agenda do studio", schedule: "Configurar agenda", services: "Serviços", clients: "Clientes", portfolio: "Galeria de trabalhos", finance: "Financeiro", marketing: "Promoções e fidelidade", communication: "Comunicação", reviews: "Avaliações", settings: "Configurações", users: "Usuários internos" })[tab]}</h1>
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
            {tab === "agenda" && <section className="admin-stats" aria-label="Resumo do studio">
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
              {can("finance") && (
                <article>
                  <span>Estimativa de hoje</span>
                  <strong>{money(data.stats.estimatedCents)}</strong>
                  <small>sem descontos aplicados</small>
                </article>
              )}
            </section>}
            <label className="mobile-module-select">Área do painel
              <select value={tab} onChange={event => setTab(event.target.value as typeof tab)}>
                <option value="agenda">Agenda</option>
                {can("schedule") && <option value="schedule">Configurar agenda</option>}
                {can("services") && <option value="services">Serviços</option>}
                {can("clients") && <option value="clients">Clientes</option>}
                {can("portfolio") && <option value="portfolio">Galeria de trabalhos</option>}
                {can("finance") && <option value="finance">Financeiro</option>}
                {can("marketing") && <option value="marketing">Promoções e fidelidade</option>}
                {can("communication") && <option value="communication">Comunicação</option>}
                {can("reviews") && <option value="reviews">Avaliações</option>}
                {can("settings") && <option value="settings">Configurações</option>}
                {can("users") && <option value="users">Usuários internos</option>}
              </select>
            </label>
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
              <button
                className={tab === "communication" ? "active" : ""}
                hidden={!can("communication")}
                type="button"
                onClick={() => setTab("communication")}
              >
                Comunicação
              </button>
              <button
                className={tab === "reviews" ? "active" : ""}
                hidden={!can("reviews")}
                type="button"
                onClick={() => setTab("reviews")}
              >
                Avaliações
              </button>
              <button
                className={tab === "settings" ? "active" : ""}
                hidden={!can("settings")}
                type="button"
                onClick={() => setTab("settings")}
              >
                Configurações
              </button>
              <button
                className={tab === "users" ? "active" : ""}
                hidden={!can("users")}
                type="button"
                onClick={() => setTab("users")}
              >
                Usuários
              </button>
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
                    <table className="admin-agenda-table">
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
                          <Fragment key={appointment.id}>
                          <tr>
                            <td data-label="Data e hora">
                              <strong>
                                {appointment.appointmentDate
                                  .split("-")
                                  .reverse()
                                  .join("/")}
                              </strong>
                              <small>
                                {appointment.startTime}
                              </small>
                            </td>
                            <td data-label="Cliente">
                              <strong>{appointment.clientName}</strong>
                              <small>{appointment.clientPhone}</small>
                              <button className="text-button admin-appointment-edit-trigger" type="button" disabled={saving} onClick={() => beginEditAppointment(appointment)}>Editar agendamento</button>
                            </td>
                            <td data-label="Serviço">
                              {appointment.serviceName ??
                                "Serviço não identificado"}
                              {appointment.hairSize && <small>Tamanho {appointment.hairSize}</small>}
                            </td>
                            <td data-label="Valor">{money(appointment.totalEstimatedCents)}</td>
                            <td data-label="Status">
                              <label className="admin-status">
                                <span className="sr-only">
                                  Status de {appointment.clientName}
                                </span>
                                <select
                                  value={appointment.status}
                                  disabled={saving}
                                  onChange={(event) => {
                                    if (event.target.value === "rescheduled") void beginReschedule(appointment);
                                    else void updateStatus(appointment.id, event.target.value);
                                  }}
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
                          {editingAppointment?.id === appointment.id && (
                            <tr className="admin-reschedule-row">
                              <td colSpan={5}>
                                <section className="admin-reschedule-panel">
                                  <div className="admin-reschedule-heading">
                                    <div><span>Editar agendamento</span><h3>Atualize os dados do cliente e do atendimento</h3></div>
                                    <button className="text-button" type="button" onClick={() => setEditingAppointment(null)}>Cancelar</button>
                                  </div>
                                  <form className="admin-appointment-edit-form" onSubmit={(event) => void saveAppointmentEdit(event, appointment)}>
                                    <label>Nome do cliente<input autoComplete="name" maxLength={120} required value={editClientName} onChange={(event) => setEditClientName(event.target.value)} /></label>
                                    <label>WhatsApp<input autoComplete="tel" inputMode="tel" maxLength={20} required value={editClientPhone} onChange={(event) => setEditClientPhone(formatWhatsapp(event.target.value))} /></label>
                                    <label>Serviço<select required value={editServiceId} onChange={(event) => { setEditServiceId(event.target.value); setEditStartTime(""); }}>
                                      <option value="">Escolha um serviço</option>
                                      {data?.services.filter((service) => service.active || service.id === appointment.serviceId).map((service) => <option key={service.id} value={service.id}>{service.name} · preço por tamanho</option>)}
                                    </select></label>
                                    <label>Tamanho do cabelo<select value={editHairSize} onChange={(event) => setEditHairSize(event.target.value as HairSize | "")}>{!editHairSize && <option value="">Tamanho não registrado</option>}{hairSizes.map((size) => <option key={size} value={size}>{size}</option>)}</select></label>
                                    <div className="admin-appointment-edit-calendar">
                                      <strong>Escolha uma data liberada</strong>
                                      {editDatesLoading ? <p>Carregando datas configuradas…</p> : editDates.length ? <CalendarMonths days={editDates} today={data?.today ?? ""} selectedDate={editAppointmentDate} onSelectDate={(date) => { setEditAppointmentDate(date); setEditStartTime(""); }} /> : <p>Não há datas futuras liberadas para este serviço e profissional.</p>}
                                    </div>
                                    <div className="admin-appointment-edit-times">
                                      <strong>Horários de início</strong>
                                      {editSlotsLoading ? <p>Consultando horários…</p> : editAppointmentDate && editDates.includes(editAppointmentDate) ? editSlots.length ? <div className="admin-reschedule-times">{editSlots.map((slot) => <button className={`booking-time-option ${slot === editStartTime ? "selected" : ""}`} type="button" key={slot} aria-pressed={slot === editStartTime} onClick={() => setEditStartTime(slot)}>{slot}</button>)}</div> : <p>Não há horários livres nessa data.</p> : <p>Selecione uma data marcada em amarelo.</p>}
                                    </div>
                                    <p>As datas amarelas e os horários seguem as liberações da administração para esta profissional e serviço.</p>
                                    <button className="admin-reschedule-confirm" type="submit" disabled={saving || !editServiceId || (Boolean(editingAppointment && (editAppointmentDate !== appointment.appointmentDate || editStartTime !== appointment.startTime || editServiceId !== (appointment.serviceId ?? "") || editHairSize !== (appointment.hairSize ?? ""))) && (!editHairSize || editDatesLoading || editSlotsLoading || !editDates.includes(editAppointmentDate) || !editSlots.includes(editStartTime)))}>{saving ? "Salvando…" : "Salvar alterações"}</button>
                                  </form>
                                </section>
                              </td>
                            </tr>
                          )}
                          {reschedulingAppointment?.id === appointment.id && (
                            <tr className="admin-reschedule-row">
                              <td colSpan={5}>
                                <section className="admin-reschedule-panel">
                                  <div className="admin-reschedule-heading">
                                    <div><span>Reagendar</span><h3>Escolha dia, horário e serviço</h3></div>
                                    <button className="text-button" type="button" onClick={() => setReschedulingAppointment(null)}>Cancelar</button>
                                  </div>
                                  {rescheduleLoading && !rescheduleDates.length ? <p>Carregando agenda…</p> : rescheduleDates.length ? (
                                    <CalendarMonths days={rescheduleDates} today={data?.today ?? ""} selectedDate={rescheduleDate} onSelectDate={(date) => void loadRescheduleSlots(appointment, date)} />
                                  ) : <p>Não há dias disponíveis para reagendamento.</p>}
                                  {rescheduleLoading && rescheduleDate && <p>Consultando horários…</p>}
                                  <label>Tamanho do cabelo<select required value={rescheduleHairSize} onChange={(event) => setRescheduleHairSize(event.target.value as HairSize)}>{hairSizes.map((size) => <option key={size} value={size}>{size}</option>)}</select></label>
                                  {rescheduleDate && !rescheduleLoading && <div className="admin-reschedule-times" aria-label="Horários disponíveis">
                                    {rescheduleSlots.length ? rescheduleSlots.map((slot) => <button className={`booking-time-option ${slot === rescheduleTime ? "selected" : ""}`} type="button" key={slot} onClick={() => void loadRescheduleServices(appointment, rescheduleDate, slot)}>{slot}</button>) : <p>Não há horários livres para esta profissional nesse dia.</p>}
                                  </div>}
                                  {rescheduleTime && <div className="admin-reschedule-service-choice">
                                    <h4>Serviços disponíveis às {rescheduleTime}</h4>
                                    {rescheduleServicesLoading ? <p>Consultando serviços para este horário…</p> : rescheduleServices.length ? <div className="booking-service-grid">
                                      {rescheduleServices.map((service) => <button className={`booking-service-option ${service.id === rescheduleServiceId ? "selected" : ""}`} type="button" key={service.id} aria-pressed={service.id === rescheduleServiceId} onClick={() => setRescheduleServiceId(service.id)}>
                                        <small>{service.categoryName ?? "Serviço"}</small><strong>{service.name}</strong><span>{formatDurationInHours(service.durationMinutes)} · {service.priceType === "consultation" ? "Sob consulta" : `${rescheduleHairSize}: ${money(priceForHairSize(service.sizePrices, rescheduleHairSize, service.priceCents))}`}</span>
                                      </button>)}
                                    </div> : <p>Nenhum serviço disponível para esta profissional nesse horário.</p>}
                                    <button className="admin-reschedule-confirm" type="button" disabled={saving || rescheduleServicesLoading || !rescheduleServiceId || !rescheduleHairSize} onClick={() => void updateStatus(appointment.id, appointment.status, rescheduleDate, rescheduleTime, rescheduleServiceId, rescheduleHairSize)}>Confirmar reagendamento</button>
                                  </div>}
                                </section>
                              </td>
                            </tr>
                          )}
                          </Fragment>
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
                  data-professional-editor="true" onSubmit={saveProfessional}
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
                              setSelectedScheduleDate(null);
                              editProfessional(professional);
                            }}
                          >
                            <strong>{professional.name}</strong>
                            <small>
                              {professional.title ?? "Profissional do studio"} ·{" "}
                              {professional.active ? "ativa" : "inativa"}
                            </small>
                          </button>
                          <div className="admin-professional-actions">
                            <button
                              className="text-button"
                              type="button"
                              disabled={saving}
                              onClick={() => editProfessional(professional)}
                            >
                              Editar
                            </button>
                            <button
                              className="text-button admin-professional-delete"
                              type="button"
                              disabled={saving}
                              onClick={() => void deleteProfessional(professional)}
                            >
                              Excluir
                            </button>
                          </div>
                        </article>
                      ))}
                    </div>
                  </section>
                  {selectedProfessional && (
                    <>
                      <OpenDatesCalendar key={selectedProfessionalId} professionalId={selectedProfessionalId} weekdays={(schedule?.hours ?? []).filter(hour => hour.professionalId === selectedProfessionalId && hour.active).map(hour => hour.weekday)} onSelect={setSelectedScheduleDate} />
                      {selectedScheduleDate && <form
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
                            Estes horários se aplicam às datas liberadas no mesmo dia da semana. Informe apenas o início de cada período; o intervalo até o próximo horário será calculado automaticamente.
                          </p>
                        </div>
                        <div className="admin-hours-list">
                          {hoursForm.filter(day => day.weekday === new Date(`${selectedScheduleDate}T12:00:00Z`).getUTCDay()).map((day) => (
                            <section
                              className="admin-hours-day"
                              key={day.weekday}
                            >
                              <div className="admin-hours-day-heading">
                                <strong>{weekdays[day.weekday]}</strong>
                                <small>
                                  {day.periods.some(
                                      (period) => period.startTime,
                                  )
                                    ? "Dia com atendimento"
                                    : "Folga"}
                                </small>
                              </div>
                              <div className="admin-hours-periods">
                                {day.periods.map((period, index) => (
                                  <div
                                    className="admin-hours-period"
                                    key={period.id}
                                  >
                                    <label>
                                      <span>Horário de início</span>
                                      <input
                                        type="time"
                                        value={period.startTime}
                                        aria-label={`Horário de início ${index + 1} de ${weekdays[day.weekday]}`}
                                        onChange={(event) =>
                                          updateWorkPeriod(
                                            day.weekday,
                                            period.id,
                                            "startTime",
                                            event.target.value,
                                          )
                                        }
                                      />
                                    </label>
                                    {period.startTime &&
                                      day.periods.length > 1 && (
                                        <button
                                          className="admin-hours-remove"
                                          type="button"
                                          onClick={() =>
                                            removeWorkPeriod(
                                              day.weekday,
                                              period.id,
                                            )
                                          }
                                          aria-label={`Remover horário ${index + 1} de ${weekdays[day.weekday]}`}
                                        >
                                          Remover
                                        </button>
                                      )}
                                  </div>
                                ))}
                              </div>
                              <p>Adicione outro horário de início para abrir um novo período. O sistema calcula os horários disponíveis entre um início e o próximo.</p>
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
                      </form>}

                    </>
                  )}
                </div>
              </section>
            )}
            {tab === "services" && (
              <section className="admin-services-layout">
                <div className="admin-service-stack">
                  <CategoryManagement onChanged={() => void load()} />
                  <form className="admin-service-form admin-service-editor" onSubmit={saveService}>
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
                        Duração (horas)
                        <input
                          type="number"
                          min="0.25"
                          max="12"
                          step="0.01"
                          value={serviceForm.durationHours}
                          onChange={(event) =>
                            setServiceForm((current) => ({
                              ...current,
                              durationHours: event.target.value,
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
                      <fieldset className="admin-service-checks admin-size-prices">
                        <legend>Preço por tamanho (R$)</legend>
                        <div className="admin-form-grid">
                          {hairSizes.map((size) => (
                            <label key={size}>
                              Tamanho {size}
                              <input
                                type="number"
                                min="0"
                                step="0.01"
                                value={serviceForm.sizePrices[size]}
                                onChange={(event) => setServiceForm((current) => ({
                                  ...current,
                                  sizePrices: { ...current.sizePrices, [size]: event.target.value },
                                }))}
                                required
                              />
                            </label>
                          ))}
                        </div>
                      </fieldset>
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
                      {serviceForm.id
                        ? "Salvar alterações"
                        : "Cadastrar serviço"}
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
                            {service.priceType === "consultation"
                              ? "Sob consulta em todos os tamanhos"
                              : hairSizes.map((size) => `${size}: ${money(priceForHairSize(service.sizePrices, size, service.priceCents))}`).join(" · ")}
                          </strong>
                          <small>
                            {formatDurationInHours(service.durationMinutes)} ·{" "}
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
