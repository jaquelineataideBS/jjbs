"use client";
/* eslint-disable @next/next/no-html-link-for-pages -- navegação pública preserva o padrão visual. */
import { FormEvent, useEffect, useState } from "react";
import { formatWhatsapp } from "../../lib/masks";
import { PublicBrand } from "../public-settings";
type Service = { id: string; name: string };
type AuthResult = { user?: { name?: string; phone?: string } };
export default function WaitlistPage() {
  const [services, setServices] = useState<Service[]>([]);
  const [form, setForm] = useState({
    name: "",
    phone: "",
    serviceId: "",
    desiredDate: "",
    period: "any",
    notes: "",
  });
  const [message, setMessage] = useState("");
  const [error, setError] = useState(false);
  useEffect(() => {
    fetch("/api/booking-options")
      .then((r) => r.json())
      .then((payload) => {
        setServices(payload.services ?? []);
        if (payload.services?.[0])
          setForm((current) => ({
            ...current,
            serviceId: payload.services[0].id,
          }));
      })
      .catch(() => undefined);
    fetch("/api/auth/me")
      .then((r) => (r.ok ? r.json() : {}))
      .then((payload: AuthResult) => {
        if (payload.user)
          setForm((current) => ({
            ...current,
            name: payload.user?.name ?? "",
            phone: formatWhatsapp(payload.user?.phone ?? ""),
          }));
      })
      .catch(() => undefined);
  }, []);
  async function submit(event: FormEvent) {
    event.preventDefault();
    const response = await fetch("/api/waitlist", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    const payload = await response.json();
    setMessage(payload.message);
    setError(!response.ok);
  }
  return (
    <main className="waitlist-page">
      <header className="inner-header">
        <PublicBrand />
        <a className="header-cta" href="/agendar">
          Ver agenda <span>↗</span>
        </a>
      </header>
      <section className="waitlist-shell">
        <div>
          <p className="eyebrow">
            Uma nova oportunidade <span>✦</span>
          </p>
          <h1>
            Avise-me quando
            <br />
            <em>surgir uma vaga.</em>
          </h1>
          <p>
            Informe sua preferência. Se um horário compatível ficar disponível,
            o studio poderá entrar em contato pelo WhatsApp.
          </p>
        </div>
        <form onSubmit={submit}>
          <h2>Lista de espera</h2>
          <label>
            Nome
            <input
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              required
            />
          </label>
          <label>
            WhatsApp
            <input
              value={form.phone}
              onChange={(e) =>
                setForm({ ...form, phone: formatWhatsapp(e.target.value) })
              }
              autoComplete="tel"
              inputMode="tel"
              maxLength={15}
              placeholder="(85) 99999-0000"
              required
            />
          </label>
          <label>
            Serviço
            <select
              value={form.serviceId}
              onChange={(e) => setForm({ ...form, serviceId: e.target.value })}
            >
              {services.map((service) => (
                <option key={service.id} value={service.id}>
                  {service.name}
                </option>
              ))}
            </select>
          </label>
          <div className="admin-form-grid">
            <label>
              Data desejada
              <input
                type="date"
                value={form.desiredDate}
                onChange={(e) =>
                  setForm({ ...form, desiredDate: e.target.value })
                }
                required
              />
            </label>
            <label>
              Período
              <select
                value={form.period}
                onChange={(e) => setForm({ ...form, period: e.target.value })}
              >
                <option value="any">Qualquer horário</option>
                <option value="morning">Manhã</option>
                <option value="afternoon">Tarde</option>
                <option value="evening">Noite</option>
              </select>
            </label>
          </div>
          <label>
            Observações
            <textarea
              value={form.notes}
              onChange={(e) => setForm({ ...form, notes: e.target.value })}
            />
          </label>
          {message && (
            <p className={error ? "form-error" : "form-success"}>{message}</p>
          )}
          <button className="button button-gold">
            <span>Entrar na lista</span>
            <b>→</b>
          </button>
        </form>
      </section>
    </main>
  );
}
