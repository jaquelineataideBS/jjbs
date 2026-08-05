"use client";

/* eslint-disable @next/next/no-html-link-for-pages -- o preview usa links nativos nas páginas públicas. */

import { useMemo, useState } from "react";

type Service = {
  id: string;
  category: string;
  name: string;
  description: string;
  duration: string;
  price: number | null;
  priceLabel: string;
};

type ClientData = {
  name: string;
  phone: string;
  email: string;
  notes: string;
};

const services: Service[] = [
  {
    id: "corte-finalizacao",
    category: "Cabelos & cortes",
    name: "Corte + finalização",
    description: "Um corte pensado para o seu rosto e para a sua rotina.",
    duration: "1h30",
    price: 150,
    priceLabel: "R$ 150",
  },
  {
    id: "morena-iluminada",
    category: "Coloração & mechas",
    name: "Morena iluminada",
    description: "Dimensão, brilho e uma cor que parece sua.",
    duration: "3h",
    price: 420,
    priceLabel: "A partir de R$ 420",
  },
  {
    id: "hidratacao-profunda",
    category: "Tratamentos",
    name: "Hidratação profunda",
    description: "Cuidado intenso para devolver maciez e luminosidade.",
    duration: "1h30",
    price: 160,
    priceLabel: "R$ 160",
  },
  {
    id: "penteado-social",
    category: "Produções",
    name: "Penteado social",
    description: "Uma finalização especial para celebrar o seu momento.",
    duration: "2h",
    price: 180,
    priceLabel: "A partir de R$ 180",
  },
  {
    id: "avaliacao",
    category: "Primeira conversa",
    name: "Avaliação personalizada",
    description: "Vamos entender seu cabelo e indicar o melhor cuidado.",
    duration: "30 min",
    price: null,
    priceLabel: "Sob consulta",
  },
];

const timeSlots = ["09:00", "10:30", "14:00", "15:30", "17:00"];

const steps = ["Serviço", "Data e horário", "Seus dados", "Revisão"];

function dateKey(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function dateLabel(date: Date) {
  return new Intl.DateTimeFormat("pt-BR", {
    weekday: "short",
    day: "2-digit",
    month: "short",
  })
    .format(date)
    .replace(".", "");
}

function buildDateOptions() {
  const dates: Array<{ value: string; label: string }> = [];
  const today = new Date();

  for (let offset = 1; dates.length < 10; offset += 1) {
    const date = new Date(today);
    date.setDate(today.getDate() + offset);
    if (date.getDay() === 0) continue;
    dates.push({ value: dateKey(date), label: dateLabel(date) });
  }

  return dates;
}

export default function BookingPage() {
  const dateOptions = useMemo(() => buildDateOptions(), []);
  const [step, setStep] = useState(1);
  const [serviceId, setServiceId] = useState(services[0].id);
  const [date, setDate] = useState(dateOptions[0]?.value ?? "");
  const [time, setTime] = useState("");
  const [client, setClient] = useState<ClientData>({ name: "", phone: "", email: "", notes: "" });
  const [acceptedPolicy, setAcceptedPolicy] = useState(false);
  const [error, setError] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const selectedService = services.find((item) => item.id === serviceId) ?? services[0];
  const selectedDate = dateOptions.find((item) => item.value === date)?.label ?? "Escolha uma data";

  function updateClient(field: keyof ClientData, value: string) {
    setClient((current) => ({ ...current, [field]: value }));
    setError("");
  }

  function goNext() {
    setError("");

    if (step === 1 && !serviceId) {
      setError("Selecione um serviço para continuar.");
      return;
    }

    if (step === 2 && (!date || !time)) {
      setError("Escolha uma data e um horário disponível.");
      return;
    }

    if (step === 3 && (!client.name.trim() || !client.phone.trim())) {
      setError("Informe seu nome e telefone para continuar.");
      return;
    }

    setStep((current) => Math.min(current + 1, steps.length));
  }

  function goBack() {
    setError("");
    setStep((current) => Math.max(current - 1, 1));
  }

  async function submitBooking() {
    if (!acceptedPolicy) {
      setError("Aceite a política de cancelamento para finalizar.");
      return;
    }

    setError("");
    setIsSubmitting(true);
    try {
      const response = await fetch("/api/appointments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          serviceId,
          appointmentDate: date,
          startTime: time,
          client,
        }),
      });
      const result = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(typeof result.message === "string" ? result.message : "Não foi possível registrar o agendamento agora.");
      }

      setSubmitted(true);
    } catch (submissionError) {
      setError(submissionError instanceof Error ? submissionError.message : "Não foi possível registrar o agendamento agora.");
    } finally {
      setIsSubmitting(false);
    }
  }

  if (submitted) {
    return (
      <main className="booking-page">
        <header className="site-header">
          <a className="brand" href="/" aria-label="Jaqueline Beauty Studio - início">
            <span className="brand-mark">J</span>
            <span><strong>Jaqueline</strong><small>Beauty Studio</small></span>
          </a>
          <a className="header-cta" href="/contato">Falar com o studio <span>↗</span></a>
        </header>
        <section className="booking-success" aria-live="polite">
          <p className="eyebrow">Pedido recebido <span>✦</span></p>
          <h1>Seu momento<br /><em>começa a ser cuidado.</em></h1>
          <p>Recebemos sua solicitação para <strong>{selectedService.name}</strong> em <strong>{selectedDate}</strong>, às <strong>{time}</strong>. A confirmação definitiva será feita pelo studio.</p>
          <div className="booking-success-card">
            <span>Próximo passo</span>
            <strong>Vamos confirmar seu horário pelo WhatsApp.</strong>
            <a className="button button-gold" href="https://wa.me/5500000000000" target="_blank" rel="noreferrer">Abrir WhatsApp <span>↗</span></a>
          </div>
          <a className="text-link" href="/">Voltar para o início <span>→</span></a>
        </section>
      </main>
    );
  }

  return (
    <main className="booking-page">
      <header className="site-header">
        <a className="brand" href="/" aria-label="Jaqueline Beauty Studio - início">
          <span className="brand-mark">J</span>
          <span><strong>Jaqueline</strong><small>Beauty Studio</small></span>
        </a>
        <nav className="main-nav" aria-label="Navegação principal">
          <a href="/">Início</a><a href="/servicos">Serviços</a><a href="/trabalhos">Trabalhos</a><a href="/#studio">O studio</a><a href="/contato">Contato</a><a href="/minha-conta">Minha conta</a>
        </nav>
        <span className="booking-header-label">Agendamento</span>
      </header>

      <section className="booking-shell">
        <div className="booking-intro">
          <p className="eyebrow">Seu próximo cuidado <span>✦</span></p>
          <h1>Vamos encontrar<br /><em>o seu horário.</em></h1>
          <p>Escolha o serviço, encontre um momento que combine com a sua rotina e deixe o resto com a gente.</p>
          <div className="booking-steps" aria-label="Etapas do agendamento">
            {steps.map((label, index) => (
              <div className={`booking-step ${step === index + 1 ? "current" : ""} ${step > index + 1 ? "complete" : ""}`} key={label}>
                <span>{step > index + 1 ? "✓" : `0${index + 1}`}</span>{label}
              </div>
            ))}
          </div>
        </div>

        <div className="booking-layout">
          <section className="booking-panel" aria-labelledby="booking-panel-title">
            <div className="booking-panel-top">
              <span>Etapa 0{step}</span>
              <span>{steps[step - 1]}</span>
            </div>

            {step === 1 && (
              <div>
                <h2 id="booking-panel-title">O que você gostaria de fazer?</h2>
                <p className="booking-helper">Você poderá conversar com a gente antes da confirmação.</p>
                <div className="booking-service-grid">
                  {services.map((service) => (
                    <button className={`booking-service-option ${service.id === serviceId ? "selected" : ""}`} type="button" key={service.id} onClick={() => { setServiceId(service.id); setError(""); }}>
                      <span className="booking-option-check" aria-hidden="true">{service.id === serviceId ? "✓" : ""}</span>
                      <small>{service.category}</small>
                      <strong>{service.name}</strong>
                      <span>{service.duration} · {service.priceLabel}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {step === 2 && (
              <div>
                <h2 id="booking-panel-title">Qual momento combina com você?</h2>
                <p className="booking-helper">Horários exibidos conforme o funcionamento atual do studio.</p>
                <fieldset className="booking-fieldset">
                  <legend>Escolha uma data</legend>
                  <div className="booking-date-grid">
                    {dateOptions.map((option) => (
                      <button className={`booking-date-option ${option.value === date ? "selected" : ""}`} type="button" key={option.value} onClick={() => { setDate(option.value); setTime(""); setError(""); }}>
                        {option.label}
                      </button>
                    ))}
                  </div>
                </fieldset>
                <fieldset className="booking-fieldset">
                  <legend>Horários disponíveis</legend>
                  <div className="booking-time-grid">
                    {timeSlots.map((slot) => (
                      <button className={`booking-time-option ${slot === time ? "selected" : ""}`} type="button" key={slot} onClick={() => { setTime(slot); setError(""); }}>
                        {slot}
                      </button>
                    ))}
                  </div>
                </fieldset>
              </div>
            )}

            {step === 3 && (
              <div>
                <h2 id="booking-panel-title">Como podemos falar com você?</h2>
                <p className="booking-helper">Usaremos estes dados somente para confirmar seu atendimento.</p>
                <div className="booking-form-grid">
                  <label>Nome completo<input value={client.name} onChange={(event) => updateClient("name", event.target.value)} placeholder="Como você prefere ser chamada?" autoComplete="name" /></label>
                  <label>Telefone / WhatsApp<input value={client.phone} onChange={(event) => updateClient("phone", event.target.value)} placeholder="(85) 99999-0000" autoComplete="tel" inputMode="tel" /></label>
                  <label className="booking-full-field">E-mail <span>(opcional)</span><input value={client.email} onChange={(event) => updateClient("email", event.target.value)} placeholder="voce@email.com" autoComplete="email" type="email" /></label>
                  <label className="booking-full-field">Alguma observação? <span>(opcional)</span><textarea value={client.notes} onChange={(event) => updateClient("notes", event.target.value)} placeholder="Conte algo importante para o seu atendimento" rows={4} /></label>
                </div>
              </div>
            )}

            {step === 4 && (
              <div>
                <h2 id="booking-panel-title">Está tudo certo?</h2>
                <p className="booking-helper">Revise os detalhes antes de enviar sua solicitação.</p>
                <div className="booking-summary">
                  <div><span>Serviço</span><strong>{selectedService.name}</strong><small>{selectedService.duration} · {selectedService.priceLabel}</small></div>
                  <div><span>Data e horário</span><strong>{selectedDate}</strong><small>{time} · Atendimento com hora marcada</small></div>
                  <div><span>Cliente</span><strong>{client.name}</strong><small>{client.phone}{client.email ? ` · ${client.email}` : ""}</small></div>
                </div>
                <label className="booking-policy"><input type="checkbox" checked={acceptedPolicy} onChange={(event) => { setAcceptedPolicy(event.target.checked); setError(""); }} /><span>Li e aceito a <a href="/contato">política de cancelamento</a> do studio.</span></label>
              </div>
            )}

            {error && <p className="booking-error" role="alert">{error}</p>}
            <div className="booking-actions-row">
              {step > 1 ? <button className="text-button" type="button" onClick={goBack}>← Voltar</button> : <a className="text-button" href="/servicos">Ver serviços</a>}
              {step < steps.length ? <button className="button button-gold" type="button" onClick={goNext}>Continuar <span>↗</span></button> : <button className="button button-gold" type="button" onClick={submitBooking} disabled={isSubmitting}>{isSubmitting ? "Enviando..." : "Solicitar horário"} <span>↗</span></button>}
            </div>
          </section>

          <aside className="booking-aside">
            <div className="booking-aside-card">
              <span className="contact-card-label">Seu cuidado</span>
              <h2>{selectedService.name}</h2>
              <p>{selectedService.description}</p>
              <div className="booking-aside-detail"><span>Duração estimada</span><strong>{selectedService.duration}</strong></div>
              <div className="booking-aside-detail"><span>Investimento</span><strong>{selectedService.priceLabel}</strong></div>
            </div>
            <div className="booking-aside-note"><span>✦</span><p>Se o serviço precisar de avaliação, a equipe confirma os detalhes com você antes de reservar.</p></div>
          </aside>
        </div>
      </section>
    </main>
  );
}
