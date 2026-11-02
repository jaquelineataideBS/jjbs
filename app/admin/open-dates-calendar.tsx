"use client";
import { useEffect, useState } from "react";
import { todayInFortaleza } from "../../lib/scheduling";

export default function OpenDatesCalendar({ professionalId, weekdays }: { professionalId: string; weekdays: number[] }) {
  const today = todayInFortaleza();
  const [month, setMonth] = useState(today.slice(0, 7));
  const [dates, setDates] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  useEffect(() => {
    const controller = new AbortController();
    fetch(`/api/admin/open-dates?${new URLSearchParams({ professionalId, month })}`, { signal: controller.signal, cache: "no-store" })
      .then(async response => { const data = await response.json(); if (!response.ok) throw new Error(data.message); setDates(data.dates); setMessage(""); })
      .catch(error => { if (error.name !== "AbortError") setMessage("Não foi possível carregar as datas."); })
      .finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [professionalId, month]);
  function changeMonth(delta: number) { const date = new Date(`${month}-01T12:00:00Z`); date.setUTCMonth(date.getUTCMonth() + delta); setLoading(true); setMonth(date.toISOString().slice(0, 7)); }
  async function toggle(date: string) {
    const open = !dates.includes(date);
    setSaving(true); setMessage("");
    try {
      const response = await fetch("/api/admin/open-dates", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ professionalId, date, open }) });
      const result = await response.json();
      if (!response.ok) throw new Error(result.message);
      setDates(current => open ? [...current, date] : current.filter(item => item !== date));
      const weekday = new Date(`${date}T12:00:00Z`).getUTCDay();
      setMessage(open && !weekdays.includes(weekday) ? "Data liberada. Configure abaixo o horário deste dia da semana para disponibilizar horários." : open ? "Data liberada para agendamento." : "Data fechada para novos agendamentos. Reservas existentes foram mantidas.");
    } catch (error) { setMessage(error instanceof Error ? error.message : "Não foi possível salvar a data."); }
    finally { setSaving(false); }
  }
  const first = new Date(`${month}-01T12:00:00Z`);
  const count = new Date(Date.UTC(first.getUTCFullYear(), first.getUTCMonth() + 1, 0)).getUTCDate();
  const title = new Intl.DateTimeFormat("pt-BR", { month: "long", year: "numeric", timeZone: "America/Fortaleza" }).format(first);
  return <section className="admin-panel open-dates-panel"><div className="admin-panel-heading"><div><span>Datas de atendimento</span><h2>Escolha os dias de trabalho</h2></div><p>As datas começam fechadas. Toque nos dias que deseja liberar e configure os horários semanais abaixo. Fechar um dia não cancela reservas já existentes.</p></div>
    <div className="open-dates-nav"><button type="button" onClick={() => changeMonth(-1)} disabled={loading || saving || month <= today.slice(0, 7)} aria-label="Mês anterior">‹</button><strong>{title}</strong><button type="button" onClick={() => changeMonth(1)} disabled={loading || saving} aria-label="Próximo mês">›</button></div>
    <div className="open-dates-grid">{["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"].map(day => <span className="open-dates-weekday" key={day}>{day}</span>)}{Array.from({ length: first.getUTCDay() }, (_, index) => <span key={`empty-${index}`} />)}{Array.from({ length: count }, (_, index) => { const day = index + 1; const date = `${month}-${String(day).padStart(2, "0")}`; const open = dates.includes(date); return <button type="button" className={open ? "open" : ""} key={date} disabled={loading || saving || date < today} aria-pressed={open} aria-label={`${day} de ${title}: ${open ? "liberado" : "fechado"}`} onClick={() => void toggle(date)}>{day}</button>; })}</div>
    <p role="status">{loading ? "Carregando datas..." : message || "Dias destacados estão liberados para agendar."}</p>
  </section>;
}
