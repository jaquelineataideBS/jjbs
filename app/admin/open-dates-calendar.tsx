"use client";
/* eslint-disable react-hooks/set-state-in-effect -- a agenda é recarregada ao trocar mês ou profissional. */
import { useEffect, useState } from "react";
import { todayInFortaleza } from "../../lib/scheduling";

type CalendarService = { id: string; name: string };
type OpenDate = { date: string; serviceIds: string[] };

export default function OpenDatesCalendar({
  professionalId,
  weekdays,
  onSelect,
}: {
  professionalId: string;
  weekdays: number[];
  onSelect: (date: string | null) => void;
}) {
  const today = todayInFortaleza();
  const [month, setMonth] = useState(today.slice(0, 7));
  const [dates, setDates] = useState<OpenDate[]>([]);
  const [services, setServices] = useState<CalendarService[]>([]);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [selectedServiceIds, setSelectedServiceIds] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    fetch(
      `/api/admin/open-dates?${new URLSearchParams({ professionalId, month })}`,
      { signal: controller.signal, cache: "no-store" },
    )
      .then(async (response) => {
        const data = await response.json();
        if (!response.ok) throw new Error(data.message);
        setServices(Array.isArray(data.services) ? data.services : []);
        setDates(Array.isArray(data.dates) ? data.dates : []);
        setMessage("");
      })
      .catch((error: unknown) => {
        if (error instanceof Error && error.name !== "AbortError") {
          setMessage("Não foi possível carregar a agenda.");
        }
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, [professionalId, month]);

  function changeMonth(delta: number) {
    const next = new Date(`${month}-01T12:00:00Z`);
    next.setUTCMonth(next.getUTCMonth() + delta);
    setSelectedDate(null);
    setSelectedServiceIds([]);
    onSelect(null);
    setLoading(true);
    setMonth(next.toISOString().slice(0, 7));
  }

  function selectDate(date: string) {
    const openDate = dates.find((item) => item.date === date);
    setSelectedDate(date);
    setSelectedServiceIds(
      openDate?.serviceIds ?? services.map((service) => service.id),
    );
    onSelect(date);
    setMessage("");
  }

  async function saveSelectedDate() {
    if (!selectedDate) return;
    if (!selectedServiceIds.length) {
      setMessage("Escolha ao menos um serviço para liberar este dia.");
      return;
    }
    setSaving(true);
    setMessage("");
    try {
      const response = await fetch("/api/admin/open-dates", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          professionalId,
          date: selectedDate,
          open: true,
          serviceIds: selectedServiceIds,
        }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.message);
      setDates((current) => [
        ...current.filter((item) => item.date !== selectedDate),
        { date: selectedDate, serviceIds: selectedServiceIds },
      ]);
      const weekday = new Date(`${selectedDate}T12:00:00Z`).getUTCDay();
      setMessage(
        !weekdays.includes(weekday)
          ? "Dia liberado. Configure abaixo o horário deste dia da semana para disponibilizar horários."
          : `Dia liberado para ${selectedServiceIds.length} serviço(s).`,
      );
    } catch (error) {
      setMessage(
        error instanceof Error ? error.message : "Não foi possível salvar o dia.",
      );
    } finally {
      setSaving(false);
    }
  }

  async function closeSelectedDate() {
    if (!selectedDate) return;
    setSaving(true);
    setMessage("");
    try {
      const response = await fetch("/api/admin/open-dates", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ professionalId, date: selectedDate, open: false }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.message);
      setDates((current) => [
        ...current.filter((item) => item.date !== selectedDate),
        { date: selectedDate, serviceIds: [] },
      ]);
      setMessage("Dia fechado para novos agendamentos. Reservas existentes foram mantidas.");
    } catch (error) {
      setMessage(
        error instanceof Error ? error.message : "Não foi possível fechar o dia.",
      );
    } finally {
      setSaving(false);
    }
  }

  const first = new Date(`${month}-01T12:00:00Z`);
  const count = new Date(
    Date.UTC(first.getUTCFullYear(), first.getUTCMonth() + 1, 0),
  ).getUTCDate();
  const title = new Intl.DateTimeFormat("pt-BR", {
    month: "long",
    year: "numeric",
    timeZone: "America/Fortaleza",
  }).format(first);
  const selectedOverride = dates.find((item) => item.date === selectedDate);
  const selectedIsOpen = Boolean(selectedOverride?.serviceIds.length);
  const allServicesSelected =
    services.length > 0 &&
    services.every((service) => selectedServiceIds.includes(service.id));
  const selectedLabel = selectedDate
    ? new Intl.DateTimeFormat("pt-BR", {
        day: "2-digit",
        month: "long",
        timeZone: "America/Fortaleza",
      }).format(new Date(`${selectedDate}T12:00:00Z`))
    : "";

  return (
    <section className="admin-panel open-dates-panel">
      <div className="admin-panel-heading">
        <div>
          <span>Agenda mensal</span>
          <h2>Serviços de cada dia</h2>
        </div>
        <p>
          Selecione uma data, escolha os serviços que serão atendidos e salve.
          Dias liberados não cancelam reservas existentes quando fechados.
        </p>
      </div>
      <div className="open-dates-nav">
        <button
          type="button"
          onClick={() => changeMonth(-1)}
          disabled={loading || saving || month <= today.slice(0, 7)}
          aria-label="Mês anterior"
        >
          ‹
        </button>
        <strong>{title}</strong>
        <button
          type="button"
          onClick={() => changeMonth(1)}
          disabled={loading || saving}
          aria-label="Próximo mês"
        >
          ›
        </button>
      </div>
      <div className="open-dates-grid" aria-label={`Dias de ${title}`}>
        {["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"].map((day) => (
          <span className="open-dates-weekday" key={day}>
            {day}
          </span>
        ))}
        {Array.from({ length: first.getUTCDay() }, (_, index) => (
          <span key={`empty-${index}`} aria-hidden="true" />
        ))}
        {Array.from({ length: count }, (_, index) => {
          const day = index + 1;
          const date = `${month}-${String(day).padStart(2, "0")}`;
          const override = dates.find((item) => item.date === date);
          const open = date >= today && Boolean(override?.serviceIds.length);
          const selected = selectedDate === date;
          return (
            <button
              type="button"
              className={`${open ? "open" : ""} ${selected ? "selected" : ""}`}
              key={date}
              disabled={loading || saving || date < today}
              aria-pressed={selected}
              aria-label={`${day} de ${title}: ${open ? "liberado" : "fechado"}`}
              onClick={() => selectDate(date)}
            >
              {day}
            </button>
          );
        })}
      </div>
      {selectedDate && (
        <div className="open-date-services">
          <fieldset disabled={saving || loading || services.length === 0}>
            <legend>
              Serviços para {selectedLabel}
              {selectedIsOpen ? " · dia liberado" : ""}
            </legend>
            {services.length ? (
              <div className="open-date-service-actions">
                <button
                  type="button"
                  aria-pressed={allServicesSelected}
                  onClick={() =>
                    setSelectedServiceIds(
                      allServicesSelected
                        ? []
                        : services.map((service) => service.id),
                    )
                  }
                >
                  {allServicesSelected ? "Desmarcar todos" : "Marcar todos"}
                </button>
              </div>
            ) : null}
            {services.length ? (
              <div className="open-date-service-list">
                {services.map((service) => (
                  <label className="open-date-service" key={service.id}>
                    <input
                      type="checkbox"
                      checked={selectedServiceIds.includes(service.id)}
                      onChange={(event) =>
                        setSelectedServiceIds((current) =>
                          event.target.checked
                            ? [...current, service.id]
                            : current.filter((id) => id !== service.id),
                        )
                      }
                    />
                    <span>{service.name}</span>
                  </label>
                ))}
              </div>
            ) : (
              <p>Vincule serviços ativos a esta profissional para liberar a agenda.</p>
            )}
          </fieldset>
          <div className="open-date-actions">
            <button
              className="button button-gold"
              type="button"
              disabled={saving || loading || services.length === 0}
              onClick={() => void saveSelectedDate()}
            >
              {selectedIsOpen ? "Salvar serviços do dia" : "Liberar dia"}
            </button>
            {selectedIsOpen && (
              <button
                className="text-button"
                type="button"
                disabled={saving}
                onClick={() => void closeSelectedDate()}
              >
                Fechar dia
              </button>
            )}
          </div>
        </div>
      )}
      <p role="status">
        {loading
          ? "Carregando datas e serviços..."
          : message || "Selecione um dia para escolher os serviços disponíveis."}
      </p>
    </section>
  );
}
