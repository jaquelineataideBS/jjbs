"use client";

/* eslint-disable @next/next/no-html-link-for-pages -- o preview usa links nativos nas páginas públicas. */
/* eslint-disable react-hooks/set-state-in-effect -- disponibilidade é carregada de forma assíncrona. */

import { useEffect, useMemo, useState } from "react";
import { formatWhatsapp } from "../../lib/masks";
import { whatsappHref } from "../../lib/public-links";
import { PublicBrand, usePublicSettings } from "../public-settings";

type Service = {
  id: string;
  category: string;
  name: string;
  description: string;
  durationMinutes: number;
  priceCents: number | null;
  priceType: string;
};
type Professional = { id: string; name: string; title: string | null };
type ClientData = { name: string; phone: string; email: string; notes: string };
type AppliedCoupon = {
  id: string;
  title: string;
  couponCode: string;
  discountType: string;
  discountValue: number;
  discountCents: number;
  comboDescription: string | null;
};

const fallbackServices: Service[] = [
  {
    id: "corte-finalizacao",
    category: "Cabelos & cortes",
    name: "Corte + finalização",
    description: "Um corte pensado para o seu rosto e para a sua rotina.",
    durationMinutes: 90,
    priceCents: 15000,
    priceType: "fixed",
  },
  {
    id: "morena-iluminada",
    category: "Coloração & mechas",
    name: "Morena iluminada",
    description: "Dimensão, brilho e uma cor que parece sua.",
    durationMinutes: 180,
    priceCents: 42000,
    priceType: "starting_at",
  },
  {
    id: "hidratacao-profunda",
    category: "Tratamentos",
    name: "Hidratação profunda",
    description: "Cuidado intenso para devolver maciez e luminosidade.",
    durationMinutes: 90,
    priceCents: 16000,
    priceType: "fixed",
  },
  {
    id: "penteado-social",
    category: "Produções",
    name: "Penteado social",
    description: "Uma finalização especial para celebrar o seu momento.",
    durationMinutes: 120,
    priceCents: 18000,
    priceType: "starting_at",
  },
  {
    id: "avaliacao",
    category: "Primeira conversa",
    name: "Avaliação personalizada",
    description: "Vamos entender seu cabelo e indicar o melhor cuidado.",
    durationMinutes: 30,
    priceCents: null,
    priceType: "consultation",
  },
];
const fallbackProfessional: Professional = {
  id: "jaqueline-justino",
  name: "Jaqueline Justino",
  title: "Fundadora & hairstylist",
};
const steps = [
  "Serviço",
  "Data e horário",
  "Seus dados",
  "Promoção",
  "Revisão",
];

function dateKey(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
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
function durationLabel(minutes: number) {
  if (minutes < 60) return `${minutes} min`;
  return minutes % 60 === 0
    ? `${minutes / 60}h`
    : `${Math.floor(minutes / 60)}h${String(minutes % 60).padStart(2, "0")}`;
}
function priceLabel(service: Service) {
  if (service.priceCents === null) return "Sob consulta";
  return `${service.priceType === "starting_at" ? "A partir de " : ""}${new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(service.priceCents / 100)}`;
}
function buildDateOptions() {
  const dates: Array<{ value: string; label: string }> = [];
  const today = new Date();
  for (let offset = 1; dates.length < 10; offset += 1) {
    const date = new Date(today);
    date.setDate(today.getDate() + offset);
    if (date.getDay() !== 0)
      dates.push({ value: dateKey(date), label: dateLabel(date) });
  }
  return dates;
}

export default function BookingPage() {
  const settings = usePublicSettings();
  const dateOptions = useMemo(() => buildDateOptions(), []);
  const [services, setServices] = useState(fallbackServices);
  const [professionals, setProfessionals] = useState<Professional[]>([
    fallbackProfessional,
  ]);
  const [slots, setSlots] = useState<string[]>([]);
  const [step, setStep] = useState(1);
  const [serviceId, setServiceId] = useState(fallbackServices[0].id);
  const [professionalId, setProfessionalId] = useState(fallbackProfessional.id);
  const [date, setDate] = useState(dateOptions[0]?.value ?? "");
  const [time, setTime] = useState("");
  const [client, setClient] = useState<ClientData>({
    name: "",
    phone: "",
    email: "",
    notes: "",
  });
  const [acceptedPolicy, setAcceptedPolicy] = useState(false);
  const [error, setError] = useState("");
  const [availabilityNote, setAvailabilityNote] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [rescheduleId, setRescheduleId] = useState("");
  const [couponCode, setCouponCode] = useState("");
  const [appliedCoupon, setAppliedCoupon] = useState<AppliedCoupon | null>(
    null,
  );
  const [validatingCoupon, setValidatingCoupon] = useState(false);

  const selectedService =
    services.find((item) => item.id === serviceId) ?? services[0];
  const selectedProfessional =
    professionals.find((item) => item.id === professionalId) ??
    fallbackProfessional;
  const selectedDate =
    dateOptions.find((item) => item.value === date)?.label ??
    "Escolha uma data";

  useEffect(() => {
    let active = true;
    const search = new URLSearchParams(window.location.search);
    const requestedServiceId = search.get("service")?.trim() ?? "";
    const requestedProfessionalId = search.get("professional")?.trim() ?? "";
    setRescheduleId(search.get("reschedule")?.trim() ?? "");
    if (requestedProfessionalId) setProfessionalId(requestedProfessionalId);

    void fetch("/api/auth/me", { cache: "no-store" })
      .then(async (response) => {
        const result = await response.json().catch(() => ({}));
        if (response.ok && result.user && active) {
          const account = result.user as {
            name?: string;
            phone?: string | null;
            email?: string;
          };
          setClient((current) => ({
            ...current,
            name: account.name ?? current.name,
            phone: formatWhatsapp(account.phone ?? current.phone),
            email: account.email ?? current.email,
          }));
        }
      })
      .catch(() => undefined);

    void fetch("/api/booking-options", { cache: "no-store" })
      .then(async (response) => {
        const result = await response.json().catch(() => ({}));
        if (
          response.ok &&
          Array.isArray(result.services) &&
          result.services.length &&
          active
        ) {
          setServices(result.services as Service[]);
          setServiceId((current) =>
            requestedServiceId &&
            result.services.some(
              (service: Service) => service.id === requestedServiceId,
            )
              ? requestedServiceId
              : result.services.some(
                    (service: Service) => service.id === current,
                  )
                ? current
                : result.services[0].id,
          );
        }
      })
      .catch(() => undefined);
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    let active = true;
    setSlots([]);
    setAvailabilityNote("");
    const query = new URLSearchParams({
      serviceId,
      date,
      professionalId,
    }).toString();
    void fetch(`/api/availability?${query}`, { cache: "no-store" })
      .then(async (response) => {
        const result = await response.json().catch(() => ({}));
        if (!active) return;
        if (!response.ok) {
          setAvailabilityNote(
            typeof result.message === "string"
              ? result.message
              : "A disponibilidade será confirmada pelo studio.",
          );
          return;
        }
        const nextProfessionals = Array.isArray(result.professionals)
          ? (result.professionals as Professional[])
          : [];
        if (nextProfessionals.length) {
          setProfessionals(nextProfessionals);
          setProfessionalId((current) =>
            nextProfessionals.some(
              (professional) => professional.id === current,
            )
              ? current
              : nextProfessionals[0].id,
          );
        } else {
          setProfessionals([]);
          setProfessionalId("");
        }
        const nextSlots = Array.isArray(result.slots)
          ? (result.slots as string[])
          : [];
        setSlots(nextSlots);
        setTime((current) => (nextSlots.includes(current) ? current : ""));
        if (!nextSlots.length && professionalId)
          setAvailabilityNote(
            "Não há horários livres nesta data para este serviço.",
          );
      })
      .catch(() => {
        if (active)
          setAvailabilityNote("A agenda será confirmada pelo studio.");
      });
    return () => {
      active = false;
    };
  }, [serviceId, date, professionalId]);

  function updateClient(field: keyof ClientData, value: string) {
    setClient((current) => ({ ...current, [field]: value }));
    setError("");
  }
  async function applyCoupon() {
    const normalized = couponCode.trim().toUpperCase().replace(/\s+/g, "");
    if (!normalized)
      return setError("Digite o código do cupom ou continue sem cupom.");
    setValidatingCoupon(true);
    setError("");
    setAppliedCoupon(null);
    try {
      const response = await fetch("/api/promotions/validate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ couponCode: normalized, serviceId }),
      });
      const result = await response.json().catch(() => ({}));
      if (!response.ok)
        throw new Error(
          typeof result.message === "string"
            ? result.message
            : "Cupom inválido.",
        );
      setCouponCode(normalized);
      setAppliedCoupon(result.promotion as AppliedCoupon);
    } catch (couponError) {
      setError(
        couponError instanceof Error
          ? couponError.message
          : "Não foi possível validar o cupom.",
      );
    } finally {
      setValidatingCoupon(false);
    }
  }
  function goNext() {
    setError("");
    if (step === 1 && !serviceId)
      return setError("Selecione um serviço para continuar.");
    if (step === 2 && (!professionalId || !date || !time))
      return setError(
        "Escolha a profissional, uma data e um horário disponível.",
      );
    if (step === 3 && (!client.name.trim() || !client.phone.trim()))
      return setError("Informe seu nome e WhatsApp para continuar.");
    if (step === 4 && couponCode.trim() && !appliedCoupon)
      return setError(
        "Clique em aplicar para validar o cupom ou apague o código para continuar sem cupom.",
      );
    setStep((current) => Math.min(current + 1, steps.length));
  }
  function goBack() {
    setError("");
    setStep((current) => Math.max(current - 1, 1));
  }
  async function submitBooking() {
    if (!acceptedPolicy)
      return setError("Aceite a política de cancelamento para finalizar.");
    setError("");
    setIsSubmitting(true);
    try {
      const response = await fetch("/api/appointments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          serviceId,
          professionalId,
          appointmentDate: date,
          startTime: time,
          client,
          couponCode: appliedCoupon?.couponCode,
          rescheduleId: rescheduleId || undefined,
        }),
      });
      const result = await response.json().catch(() => ({}));
      if (!response.ok)
        throw new Error(
          typeof result.message === "string"
            ? result.message
            : "Não foi possível registrar o agendamento agora.",
        );
      setSubmitted(true);
    } catch (submissionError) {
      setError(
        submissionError instanceof Error
          ? submissionError.message
          : "Não foi possível registrar o agendamento agora.",
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  if (submitted)
    return (
      <main className="booking-page">
        <header className="site-header">
          <PublicBrand />
          <a className="header-cta" href="/contato">
            Falar com o studio <span>↗</span>
          </a>
        </header>
        <section className="booking-success" aria-live="polite">
          <p className="eyebrow">
            Pedido recebido <span>✦</span>
          </p>
          <h1>
            Seu momento
            <br />
            <em>começa a ser cuidado.</em>
          </h1>
          <p>
            Recebemos sua solicitação para{" "}
            <strong>{selectedService.name}</strong> com{" "}
            <strong>{selectedProfessional.name}</strong>, em{" "}
            <strong>{selectedDate}</strong>, às <strong>{time}</strong>. A
            confirmação definitiva será feita pelo studio.
          </p>
          <div className="booking-success-card">
            <span>Próximo passo</span>
            <strong>Vamos confirmar seu horário pelo WhatsApp.</strong>
            <a
              className="button button-gold"
              href={whatsappHref(settings.whatsapp)}
              target="_blank"
              rel="noreferrer"
            >
              Abrir WhatsApp <span>↗</span>
            </a>
          </div>
          <a className="text-link" href="/">
            Voltar para o início <span>→</span>
          </a>
        </section>
      </main>
    );

  return (
    <main className="booking-page">
      <header className="site-header">
        <PublicBrand />
        <nav className="main-nav" aria-label="Navegação principal">
          <a href="/">Início</a>
          <a href="/servicos">Serviços</a>
          <a href="/trabalhos">Trabalhos</a>
          <a href="/#studio">O studio</a>
          <a href="/contato">Contato</a>
          <a href="/minha-conta">Minha conta</a>
        </nav>
        <span className="booking-header-label">Agendamento</span>
      </header>
      <section className="booking-shell">
        <div className="booking-intro">
          <p className="eyebrow">
            Seu próximo cuidado <span>✦</span>
          </p>
          <h1>
            Vamos encontrar
            <br />
            <em>o seu horário.</em>
          </h1>
          <p>
            Escolha o serviço, a profissional e um momento que combine com a sua
            rotina.
          </p>
          <div className="booking-steps" aria-label="Etapas do agendamento">
            {steps.map((label, index) => (
              <div
                className={`booking-step ${step === index + 1 ? "current" : ""} ${step > index + 1 ? "complete" : ""}`}
                key={label}
              >
                <span>{step > index + 1 ? "✓" : `0${index + 1}`}</span>
                {label}
              </div>
            ))}
          </div>
        </div>
        <div className="booking-layout">
          <section
            className="booking-panel"
            aria-labelledby="booking-panel-title"
          >
            <div className="booking-panel-top">
              <span>Etapa 0{step}</span>
              <span>{steps[step - 1]}</span>
            </div>
            {step === 1 && (
              <div>
                <h2 id="booking-panel-title">O que você gostaria de fazer?</h2>
                <p className="booking-helper">
                  Você poderá conversar com a gente antes da confirmação.
                </p>
                <div className="booking-service-grid">
                  {services.map((service) => (
                    <button
                      className={`booking-service-option ${service.id === serviceId ? "selected" : ""}`}
                      type="button"
                      key={service.id}
                      onClick={() => {
                        setServiceId(service.id);
                        setTime("");
                        setCouponCode("");
                        setAppliedCoupon(null);
                        setError("");
                      }}
                    >
                      <span className="booking-option-check" aria-hidden="true">
                        {service.id === serviceId ? "✓" : ""}
                      </span>
                      <small>{service.category}</small>
                      <strong>{service.name}</strong>
                      <span>
                        {durationLabel(service.durationMinutes)} ·{" "}
                        {priceLabel(service)}
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            )}
            {step === 2 && (
              <div>
                <h2 id="booking-panel-title">Qual momento combina com você?</h2>
                <p className="booking-helper">
                  Os horários são calculados conforme o expediente, intervalo e
                  bloqueios da profissional.
                </p>
                <fieldset className="booking-fieldset">
                  <legend>Escolha a profissional</legend>
                  <div className="booking-date-grid">
                    {professionals.map((professional) => (
                      <button
                        className={`booking-date-option ${professional.id === professionalId ? "selected" : ""}`}
                        type="button"
                        key={professional.id}
                        onClick={() => {
                          setProfessionalId(professional.id);
                          setTime("");
                          setError("");
                        }}
                      >
                        <strong>{professional.name}</strong>
                        <small>
                          {professional.title ?? "Profissional do studio"}
                        </small>
                      </button>
                    ))}
                  </div>
                </fieldset>
                <fieldset className="booking-fieldset">
                  <legend>Escolha uma data</legend>
                  <div className="booking-date-grid">
                    {dateOptions.map((option) => (
                      <button
                        className={`booking-date-option ${option.value === date ? "selected" : ""}`}
                        type="button"
                        key={option.value}
                        onClick={() => {
                          setDate(option.value);
                          setTime("");
                          setError("");
                        }}
                      >
                        {option.label}
                      </button>
                    ))}
                  </div>
                </fieldset>
                <fieldset className="booking-fieldset">
                  <legend>Horários disponíveis</legend>
                  <div className="booking-time-grid">
                    {slots.map((slot) => (
                      <button
                        className={`booking-time-option ${slot === time ? "selected" : ""}`}
                        type="button"
                        key={slot}
                        onClick={() => {
                          setTime(slot);
                          setError("");
                        }}
                      >
                        {slot}
                      </button>
                    ))}
                  </div>
                  {availabilityNote && (
                    <p className="booking-helper">{availabilityNote}</p>
                  )}
                </fieldset>
              </div>
            )}
            {step === 3 && (
              <div>
                <h2 id="booking-panel-title">Como podemos falar com você?</h2>
                <p className="booking-helper">
                  Usaremos estes dados somente para confirmar seu atendimento.
                </p>
                <div className="booking-form-grid">
                  <label>
                    Nome completo
                    <input
                      value={client.name}
                      onChange={(event) =>
                        updateClient("name", event.target.value)
                      }
                      placeholder="Como você prefere ser chamada?"
                      autoComplete="name"
                    />
                  </label>
                  <label>
                    WhatsApp
                    <input
                      value={client.phone}
                      onChange={(event) =>
                        updateClient(
                          "phone",
                          formatWhatsapp(event.target.value),
                        )
                      }
                      placeholder="(85) 99999-0000"
                      autoComplete="tel"
                      inputMode="tel"
                      maxLength={15}
                    />
                  </label>
                  <label className="booking-full-field">
                    E-mail <span>(opcional)</span>
                    <input
                      value={client.email}
                      onChange={(event) =>
                        updateClient("email", event.target.value)
                      }
                      placeholder="voce@email.com"
                      autoComplete="email"
                      type="email"
                    />
                  </label>
                  <label className="booking-full-field">
                    Alguma observação? <span>(opcional)</span>
                    <textarea
                      value={client.notes}
                      onChange={(event) =>
                        updateClient("notes", event.target.value)
                      }
                      placeholder="Conte algo importante para o seu atendimento"
                      rows={4}
                    />
                  </label>
                </div>
              </div>
            )}
            {step === 4 && (
              <div>
                <h2 id="booking-panel-title">Você tem um cupom?</h2>
                <p className="booking-helper">
                  Digite o código da promoção. Se não tiver, pode continuar normalmente.
                </p>
                <div className="booking-coupon-box">
                  <label htmlFor="booking-coupon">Cupom de promoção</label>
                  <div>
                    <input
                      id="booking-coupon"
                      value={couponCode}
                      onChange={(event) => {
                        setCouponCode(event.target.value.toUpperCase());
                        setAppliedCoupon(null);
                        setError("");
                      }}
                      placeholder="Ex.: BELEZA10"
                      maxLength={40}
                      autoComplete="off"
                    />
                    <button className="button button-gold" type="button" onClick={() => void applyCoupon()} disabled={validatingCoupon}>
                      {validatingCoupon ? "Validando..." : "Aplicar"}
                    </button>
                  </div>
                  {appliedCoupon && <p className="booking-coupon-success"><strong>✓ {appliedCoupon.title}</strong><span>Cupom {appliedCoupon.couponCode} aplicado ao agendamento.</span></p>}
                </div>
              </div>
            )}
            {step === 5 && (
              <div>
                <h2 id="booking-panel-title">Está tudo certo?</h2>
                <p className="booking-helper">
                  Revise os detalhes antes de enviar sua solicitação.
                </p>
                <div className="booking-summary">
                  <div>
                    <span>Serviço</span>
                    <strong>{selectedService.name}</strong>
                    <small>
                      {durationLabel(selectedService.durationMinutes)} ·{" "}
                      {priceLabel(selectedService)}
                    </small>
                  </div>
                  <div>
                    <span>Data e horário</span>
                    <strong>{selectedDate}</strong>
                    <small>
                      {time} · {selectedProfessional.name}
                    </small>
                  </div>
                  <div>
                    <span>Cliente</span>
                    <strong>{client.name}</strong>
                    <small>
                      {client.phone}
                      {client.email ? ` · ${client.email}` : ""}
                    </small>
                  </div>
                  {appliedCoupon && <div><span>Promoção</span><strong>{appliedCoupon.title}</strong><small>Cupom {appliedCoupon.couponCode}{appliedCoupon.discountCents > 0 ? ` · desconto de ${new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(appliedCoupon.discountCents / 100)}` : ""}</small></div>}
                </div>
                <label className="booking-policy">
                  <input
                    type="checkbox"
                    checked={acceptedPolicy}
                    onChange={(event) => {
                      setAcceptedPolicy(event.target.checked);
                      setError("");
                    }}
                  />
                  <span>
                    Li e aceito a{" "}
                    <a href="/contato">política de cancelamento</a> de {settings.salonName}.
                  </span>
                </label>
                <p className="booking-policy-copy">{settings.cancellationPolicy}</p>
              </div>
            )}
            {error && (
              <p className="booking-error" role="alert">
                {error}
              </p>
            )}
            <div className="booking-actions-row">
              {step > 1 ? (
                <button className="text-button" type="button" onClick={goBack}>
                  ← Voltar
                </button>
              ) : (
                <a className="text-button" href="/servicos">
                  Ver serviços
                </a>
              )}
              {step < steps.length ? (
                <button
                  className="button button-gold"
                  type="button"
                  onClick={goNext}
                >
                  Continuar <span>↗</span>
                </button>
              ) : (
                <button
                  className="button button-gold"
                  type="button"
                  onClick={submitBooking}
                  disabled={isSubmitting}
                >
                  {isSubmitting ? "Enviando..." : "Solicitar horário"}{" "}
                  <span>↗</span>
                </button>
              )}
            </div>
          </section>
          <aside className="booking-aside">
            <div className="booking-aside-card">
              <span className="contact-card-label">Seu cuidado</span>
              <h2>{selectedService.name}</h2>
              <p>{selectedService.description}</p>
              <div className="booking-aside-detail">
                <span>Profissional</span>
                <strong>{selectedProfessional.name}</strong>
              </div>
              <div className="booking-aside-detail">
                <span>Duração estimada</span>
                <strong>
                  {durationLabel(selectedService.durationMinutes)}
                </strong>
              </div>
              <div className="booking-aside-detail">
                <span>Investimento</span>
                <strong>{priceLabel(selectedService)}</strong>
              </div>
            </div>
            <div className="booking-aside-note">
              <span>✦</span>
              <p>
                Se o serviço precisar de avaliação, a equipe confirma os
                detalhes com você antes de reservar. {settings.depositPercent > 0 ? `Para confirmar, o sinal é de ${settings.depositPercent}%. ` : ""}A tolerância de atraso é de {settings.toleranceMinutes} minutos.
              </p>
            </div>
          </aside>
        </div>
      </section>
    </main>
  );
}
