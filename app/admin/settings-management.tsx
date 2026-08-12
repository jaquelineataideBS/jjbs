"use client";

/* eslint-disable react-hooks/set-state-in-effect -- configurações protegidas são carregadas após autenticação. */

import { FormEvent, useEffect, useState } from "react";
import { formatWhatsapp } from "../../lib/masks";

type Settings = {
  salonName: string;
  logoUrl: string | null;
  address: string | null;
  whatsapp: string | null;
  instagram: string | null;
  cancellationHours: number;
  depositPercent: number;
  toleranceMinutes: number;
  rescheduleAllowed: boolean;
  noShowBlockThreshold: number;
  noShowBlockDays: number;
  cancellationPolicy: string;
  privacyPolicy: string;
  homepageHeadline: string | null;
  homepageDescription: string | null;
  bannerImageUrl: string | null;
  primaryColor: string;
  accentColor: string;
};

type Entry = {
  id: string;
  name: string;
  phone: string;
  desiredDate: string;
  period: string;
  notes: string | null;
  status: string;
  serviceName: string;
  professionalName: string | null;
};

const defaults: Settings = {
  salonName: "Jaqueline Justino Beauty Studio",
  logoUrl: null,
  address: null,
  whatsapp: null,
  instagram: null,
  cancellationHours: 24,
  depositPercent: 0,
  toleranceMinutes: 15,
  rescheduleAllowed: true,
  noShowBlockThreshold: 3,
  noShowBlockDays: 30,
  cancellationPolicy:
    "Cancelamentos e reagendamentos devem ser solicitados com pelo menos 24 horas de antecedência.",
  privacyPolicy:
    "Seus dados são utilizados apenas para atendimento, agendamento e comunicação autorizada com o studio.",
  homepageHeadline: null,
  homepageDescription: null,
  bannerImageUrl: null,
  primaryColor: "#0B0B0B",
  accentColor: "#D4AF37",
};

const statusLabels: Record<string, string> = {
  waiting: "Aguardando",
  contacted: "Contatada",
  booked: "Agendada",
  cancelled: "Cancelada",
};

export default function SettingsManagement() {
  const [form, setForm] = useState<Settings>(defaults);
  const [entries, setEntries] = useState<Entry[]>([]);
  const [feedback, setFeedback] = useState("");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [uploadingBanner, setUploadingBanner] = useState(false);

  async function load() {
    const [settingsResponse, waitlistResponse] = await Promise.all([
      fetch("/api/admin/settings", { cache: "no-store" }),
      fetch("/api/admin/waitlist", { cache: "no-store" }),
    ]);
    const settingsPayload = await settingsResponse.json();
    const waitlistPayload = await waitlistResponse.json();
    if (!settingsResponse.ok) throw new Error(settingsPayload.message);
    if (!waitlistResponse.ok) throw new Error(waitlistPayload.message);
    setForm({
      ...defaults,
      ...settingsPayload.settings,
      whatsapp: formatWhatsapp(settingsPayload.settings?.whatsapp ?? ""),
    });
    setEntries(waitlistPayload.entries ?? []);
  }

  useEffect(() => {
    load().catch((loadError) => setError(loadError.message));
  }, []);

  async function submit(event: FormEvent) {
    event.preventDefault();
    setSaving(true);
    setError("");
    const response = await fetch("/api/admin/settings", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    const payload = await response.json();
    setSaving(false);
    if (!response.ok) {
      setError(payload.message);
      return;
    }
    setFeedback(payload.message);
    setForm({
      ...defaults,
      ...payload.settings,
      whatsapp: formatWhatsapp(payload.settings?.whatsapp ?? ""),
    });
  }

  async function updateEntry(id: string, status: string) {
    const response = await fetch("/api/admin/waitlist", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, status }),
    });
    const payload = await response.json();
    if (!response.ok) {
      setError(payload.message);
      return;
    }
    setFeedback(payload.message);
    await load();
  }

  async function uploadBanner(file: File | undefined) {
    if (!file) return;
    if (!["image/jpeg", "image/png"].includes(file.type) || file.size > 4 * 1024 * 1024) {
      setError("Escolha uma imagem JPEG ou PNG de até 4 MB.");
      return;
    }
    setUploadingBanner(true);
    setError("");
    const data = new FormData();
    data.append("file", file);
    try {
      const response = await fetch("/api/admin/media", { method: "POST", body: data });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.message);
      setForm((current) => ({ ...current, bannerImageUrl: payload.imageUrl }));
      setFeedback("Imagem carregada. Clique em salvar configurações para publicar na página inicial.");
    } catch (uploadError) {
      setError(uploadError instanceof Error ? uploadError.message : "Não foi possível enviar a imagem.");
    } finally {
      setUploadingBanner(false);
    }
  }

  return (
    <section className="settings-module">
      <div className="admin-panel-heading">
        <div>
          <span>Operação e LGPD</span>
          <h2>Configurações do studio</h2>
        </div>
        <p>Dados públicos, regras de cancelamento, privacidade e identidade.</p>
      </div>
      {feedback && <p className="admin-feedback">{feedback}</p>}
      {error && <p className="admin-feedback error">{error}</p>}
      <div className="settings-layout">
        <form className="admin-service-form" onSubmit={submit}>
          <div className="finance-form-title">
            <span>Dados públicos</span>
            <h3>Identidade e contato</h3>
          </div>
          <label>
            Nome do studio
            <input
              value={form.salonName}
              onChange={(event) =>
                setForm({ ...form, salonName: event.target.value })
              }
            />
          </label>
          <label>
            Endereço
            <input
              value={form.address ?? ""}
              onChange={(event) =>
                setForm({ ...form, address: event.target.value })
              }
            />
          </label>
          <label>
            WhatsApp
            <input
              value={form.whatsapp ?? ""}
              onChange={(event) =>
                setForm({
                  ...form,
                  whatsapp: formatWhatsapp(event.target.value),
                })
              }
              autoComplete="tel"
              inputMode="tel"
              maxLength={15}
              placeholder="(85) 99999-0000"
            />
          </label>
          <label>
            Instagram
            <input
              value={form.instagram ?? ""}
              onChange={(event) =>
                setForm({ ...form, instagram: event.target.value })
              }
            />
          </label>
          <div className="finance-form-title">
            <span>Página inicial</span>
            <h3>Apresentação pública</h3>
          </div>
          <label>
            Frase principal
            <input value={form.homepageHeadline ?? ""} onChange={(event) => setForm({ ...form, homepageHeadline: event.target.value })} placeholder="Seu cabelo, sua assinatura." />
          </label>
          <label>
            Descrição da página inicial
            <textarea value={form.homepageDescription ?? ""} onChange={(event) => setForm({ ...form, homepageDescription: event.target.value })} />
          </label>
          <label>
            Foto de capa (JPEG ou PNG)
            <input type="file" accept="image/jpeg,image/png,.jpg,.jpeg,.png" disabled={uploadingBanner} onChange={(event) => void uploadBanner(event.target.files?.[0])} />
            {form.bannerImageUrl && <img className="settings-banner-preview" src={form.bannerImageUrl} alt="Prévia da capa" />}
          </label>
          <div className="admin-form-grid">
            <label>Cor principal<input type="color" value={form.primaryColor} onChange={(event) => setForm({ ...form, primaryColor: event.target.value })} /></label>
            <label>Cor de destaque<input type="color" value={form.accentColor} onChange={(event) => setForm({ ...form, accentColor: event.target.value })} /></label>
          </div>
          <div className="finance-form-title">
            <span>Regras</span>
            <h3>Cancelamento e sinal</h3>
          </div>
          <div className="admin-form-grid">
            <label>
              Antecedência (horas)
              <input
                type="number"
                value={form.cancellationHours}
                onChange={(event) =>
                  setForm({
                    ...form,
                    cancellationHours: Number(event.target.value),
                  })
                }
              />
            </label>
            <label>
              Sinal (%)
              <input
                type="number"
                value={form.depositPercent}
                onChange={(event) =>
                  setForm({
                    ...form,
                    depositPercent: Number(event.target.value),
                  })
                }
              />
            </label>
            <label>
              Tolerância (min)
              <input
                type="number"
                value={form.toleranceMinutes}
                onChange={(event) =>
                  setForm({
                    ...form,
                    toleranceMinutes: Number(event.target.value),
                  })
                }
              />
            </label>
            <label>
              Faltas para bloqueio
              <input
                type="number"
                value={form.noShowBlockThreshold}
                onChange={(event) =>
                  setForm({
                    ...form,
                    noShowBlockThreshold: Number(event.target.value),
                  })
                }
              />
            </label>
          </div>
          <label>
            Política de cancelamento
            <textarea
              value={form.cancellationPolicy}
              onChange={(event) =>
                setForm({ ...form, cancellationPolicy: event.target.value })
              }
            />
          </label>
          <label>
            Política de privacidade
            <textarea
              value={form.privacyPolicy}
              onChange={(event) =>
                setForm({ ...form, privacyPolicy: event.target.value })
              }
            />
          </label>
          <label className="admin-toggle">
            <input
              type="checkbox"
              checked={form.rescheduleAllowed}
              onChange={(event) =>
                setForm({ ...form, rescheduleAllowed: event.target.checked })
              }
            />
            Permitir reagendamento
          </label>
          <button className="button button-gold" disabled={saving}>
            <span>{saving ? "Salvando..." : "Salvar configurações"}</span>
            <b>→</b>
          </button>
        </form>
        <section className="admin-panel waitlist-admin">
          <div className="finance-toolbar">
            <div>
              <span>Oportunidades</span>
              <h3>Lista de espera</h3>
            </div>
            <small>
              {entries.filter((entry) => entry.status === "waiting").length}{" "}
              aguardando
            </small>
          </div>
          {entries.length ? (
            entries.map((entry) => (
              <article key={entry.id}>
                <div>
                  <span>
                    {entry.desiredDate.split("-").reverse().join("/")} ·{" "}
                    {entry.period}
                  </span>
                  <h4>{entry.name}</h4>
                  <p>
                    {entry.serviceName} · {formatWhatsapp(entry.phone)}
                  </p>
                  {entry.notes && <small>{entry.notes}</small>}
                </div>
                <select
                  value={entry.status}
                  onChange={(event) =>
                    void updateEntry(entry.id, event.target.value)
                  }
                >
                  {Object.entries(statusLabels).map(([value, label]) => (
                    <option value={value} key={value}>
                      {label}
                    </option>
                  ))}
                </select>
              </article>
            ))
          ) : (
            <p className="admin-empty-state">A lista de espera está vazia.</p>
          )}
        </section>
      </div>
    </section>
  );
}
