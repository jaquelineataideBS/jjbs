"use client";
import { useState } from "react";

export default function CalendarMonths({ days, today }: { days: string[]; today: string }) {
  const [offset, setOffset] = useState(0);
  const first = new Date(`${today.slice(0, 7)}-01T12:00:00Z`);
  first.setUTCMonth(first.getUTCMonth() + offset);
  const month = first.toISOString().slice(0, 7);
  const count = new Date(Date.UTC(first.getUTCFullYear(), first.getUTCMonth() + 1, 0)).getUTCDate();
  const title = new Intl.DateTimeFormat("pt-BR", { month: "long", year: "numeric", timeZone: "America/Fortaleza" }).format(first);
  const available = new Set(days);
  return <div className="home-calendars" data-ui><div className="home-calendar">
    <div className="calendar-navigation"><button type="button" onClick={() => setOffset(offset - 1)} disabled={offset === 0} aria-label="Mês anterior">‹</button><h3>{title}</h3><button type="button" onClick={() => setOffset(offset + 1)} disabled={offset === 11} aria-label="Próximo mês">›</button></div>
    <table aria-label={`Calendário de disponibilidade: ${title}`}><thead><tr>{["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"].map(day => <th scope="col" key={day}>{day}</th>)}</tr></thead><tbody>{Array.from({ length: Math.ceil((first.getUTCDay() + count) / 7) }, (_, week) => <tr key={week}>{Array.from({ length: 7 }, (_, weekday) => {
      const day = week * 7 + weekday - first.getUTCDay() + 1;
      if (day < 1 || day > count) return <td key={weekday} />;
      const date = `${month}-${String(day).padStart(2, "0")}`;
      const label = new Intl.DateTimeFormat("pt-BR", { dateStyle: "full", timeZone: "America/Fortaleza" }).format(new Date(`${date}T12:00:00Z`));
      return <td key={weekday}>{available.has(date) ? <a href={`/agendar?date=${date}`} aria-label={`Consultar horários em ${label}`} aria-current={date === today ? "date" : undefined}>{day}</a> : <span aria-label={`${label}: sem disponibilidade exibida`}>{day}</span>}</td>;
    })}</tr>)}</tbody></table><p className="home-calendar-legend"><span aria-hidden="true" /> Dias disponíveis para agendar</p>
  </div></div>;
}
