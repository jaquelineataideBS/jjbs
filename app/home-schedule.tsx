import { getPublicSchedule } from "../lib/public-schedule";
import { todayInFortaleza } from "../lib/scheduling";
import CalendarMonths from "./calendar-months";

export default async function HomeSchedule() {
  const { days, failed } = await getPublicSchedule();
  const today = todayInFortaleza();
  return <section className="home-section home-schedule" id="agenda" aria-labelledby="schedule-title">
    <div className="home-section-top"><h2 id="schedule-title">Dias disponíveis.</h2><a className="home-link" href="/agendar">Consultar horários ↗</a></div>
    <p>Agenda dos próximos 12 meses, conforme os dias de atendimento definidos pelo studio. Os horários variam conforme o serviço e a profissional.</p>
    {!failed && <CalendarMonths days={days} today={today} />}
    {(failed || !days.length) && <p className="home-schedule-empty">{failed ? "Não foi possível consultar a agenda agora. Tente novamente em instantes." : "Sem horários disponíveis nos próximos 12 meses. Entre na lista de espera para avisarmos você."}</p>}
    <a className="home-secondary" href="/lista-de-espera">Entrar na lista de espera ↗</a>
  </section>;
}
