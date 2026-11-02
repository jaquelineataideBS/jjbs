import { getPublicSchedule } from "../lib/public-schedule";

export default async function HomeSchedule() {
  const { days, failed } = await getPublicSchedule();
  return <section className="home-section home-schedule" id="agenda" aria-labelledby="schedule-title">
    <div className="home-section-top"><h2 id="schedule-title">Dias disponíveis.</h2><a className="home-link" href="/agendar">Consultar horários ↗</a></div>
    <p>Agenda das próximas duas semanas, conforme os dias de atendimento definidos pelo studio. Os horários variam conforme o serviço e a profissional.</p>
    {days.length > 0 ? <ul className="home-schedule-days">{days.map(date => {
      const value = new Date(`${date}T12:00:00Z`);
      return <li key={date}><a href={`/agendar?date=${date}`} aria-label={`Consultar horários em ${new Intl.DateTimeFormat("pt-BR", { dateStyle: "full", timeZone: "America/Fortaleza" }).format(value)}`}><span>{new Intl.DateTimeFormat("pt-BR", { weekday: "short", timeZone: "America/Fortaleza" }).format(value)}</span><strong>{value.getUTCDate().toString().padStart(2, "0")}</strong><span>{new Intl.DateTimeFormat("pt-BR", { month: "short", timeZone: "America/Fortaleza" }).format(value)}</span></a></li>;
    })}</ul> : <p className="home-schedule-empty">{failed ? "Não foi possível consultar a agenda agora. Tente novamente em instantes." : "Sem horários disponíveis nas próximas duas semanas. Entre na lista de espera para avisarmos você."}</p>}
    <a className="home-secondary" href="/lista-de-espera">Entrar na lista de espera ↗</a>
  </section>;
}
