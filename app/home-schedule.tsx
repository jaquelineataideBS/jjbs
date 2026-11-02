import { getPublicSchedule } from "../lib/public-schedule";
import { todayInFortaleza } from "../lib/scheduling";

export default async function HomeSchedule() {
  const { days, failed } = await getPublicSchedule();
  const today = todayInFortaleza();
  const last = new Date(`${today}T12:00:00Z`);
  last.setUTCDate(last.getUTCDate() + 13);
  const months = [...new Set([today.slice(0, 7), last.toISOString().slice(0, 7)])];
  const available = new Set(days);
  return <section className="home-section home-schedule" id="agenda" aria-labelledby="schedule-title">
    <div className="home-section-top"><h2 id="schedule-title">Dias disponíveis.</h2><a className="home-link" href="/agendar">Consultar horários ↗</a></div>
    <p>Agenda das próximas duas semanas, conforme os dias de atendimento definidos pelo studio. Os horários variam conforme o serviço e a profissional.</p>
    {!failed && <div className="home-calendars" data-ui>{months.map(month => {
      const first = new Date(`${month}-01T12:00:00Z`);
      const count = new Date(Date.UTC(first.getUTCFullYear(), first.getUTCMonth() + 1, 0)).getUTCDate();
      const title = new Intl.DateTimeFormat("pt-BR", { month: "long", year: "numeric", timeZone: "America/Fortaleza" }).format(first);
      return <div className="home-calendar" key={month}>
        <h3>{title}</h3>
        <table aria-label={`Calendário de disponibilidade: ${title}`}>
          <thead><tr>{["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"].map(day => <th scope="col" key={day}>{day}</th>)}</tr></thead>
          <tbody>{Array.from({ length: Math.ceil((first.getUTCDay() + count) / 7) }, (_, week) => <tr key={week}>{Array.from({ length: 7 }, (_, weekday) => {
            const day = week * 7 + weekday - first.getUTCDay() + 1;
            if (day < 1 || day > count) return <td key={weekday} />;
            const date = `${month}-${String(day).padStart(2, "0")}`;
            const label = new Intl.DateTimeFormat("pt-BR", { dateStyle: "full", timeZone: "America/Fortaleza" }).format(new Date(`${date}T12:00:00Z`));
            return <td key={weekday}>{available.has(date) ? <a href={`/agendar?date=${date}`} aria-label={`Consultar horários em ${label}`} aria-current={date === today ? "date" : undefined}>{day}</a> : <span aria-label={`${label}: sem disponibilidade exibida`} aria-current={date === today ? "date" : undefined}>{day}</span>}</td>;
          })}</tr>)}</tbody>
        </table>
        <p className="home-calendar-legend"><span aria-hidden="true" /> Dias disponíveis para agendar</p>
      </div>;
    })}</div>}
    {(failed || !days.length) && <p className="home-schedule-empty">{failed ? "Não foi possível consultar a agenda agora. Tente novamente em instantes." : "Sem horários disponíveis nas próximas duas semanas. Entre na lista de espera para avisarmos você."}</p>}
    <a className="home-secondary" href="/lista-de-espera">Entrar na lista de espera ↗</a>
  </section>;
}
