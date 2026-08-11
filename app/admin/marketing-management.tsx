"use client";

/* eslint-disable react-hooks/set-state-in-effect -- dados protegidos são carregados após autenticação. */

import { FormEvent, useEffect, useMemo, useState } from "react";

type Promotion = { id: string; title: string; description: string; discountType: string; discountValue: number; couponCode: string | null; audience: string; comboDescription: string | null; startDate: string; endDate: string; active: boolean; featured: boolean; serviceIds: string[] };
type Service = { id: string; name: string; active: boolean };
type Client = { id: string; name: string; phone: string; loyalty: { points: number; stamps: number; referrals: number } };
type MarketingData = { promotions: Promotion[]; services: Service[]; clients: Client[] };
type PromotionForm = Omit<Promotion, "id"> & { id?: string; discountInput: string };
const emptyPromotion: PromotionForm = { title: "", description: "", discountType: "percentage", discountValue: 0, discountInput: "", couponCode: "", audience: "all", comboDescription: "", startDate: "", endDate: "", active: true, featured: false, serviceIds: [] };
const audienceLabels: Record<string, string> = { all: "Todas as clientes", birthday: "Aniversariantes", first_visit: "Primeira visita", off_peak: "Horários de menor movimento" };

function discountLabel(item: Pick<Promotion, "discountType" | "discountValue">) {
  if (item.discountType === "combo") return "Combo especial";
  if (item.discountType === "percentage") return `${item.discountValue}% OFF`;
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(item.discountValue / 100);
}

export default function MarketingManagement() {
  const [data, setData] = useState<MarketingData | null>(null);
  const [form, setForm] = useState<PromotionForm>(emptyPromotion);
  const [clientId, setClientId] = useState("");
  const [kind, setKind] = useState("service");
  const [points, setPoints] = useState("0");
  const [stamps, setStamps] = useState("1");
  const [referrals, setReferrals] = useState("0");
  const [description, setDescription] = useState("");
  const [query, setQuery] = useState("");
  const [feedback, setFeedback] = useState("");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  async function load() {
    const response = await fetch("/api/admin/marketing", { cache: "no-store" });
    const payload = await response.json();
    if (!response.ok) throw new Error(payload.message ?? "Falha ao carregar.");
    setData(payload);
  }
  useEffect(() => { load().catch((reason) => setError(reason.message)); }, []);

  const filteredClients = useMemo(() => {
    const term = query.trim().toLocaleLowerCase("pt-BR");
    return (data?.clients ?? []).filter((client) => !term || `${client.name} ${client.phone}`.toLocaleLowerCase("pt-BR").includes(term));
  }, [data, query]);

  function edit(promotion: Promotion) {
    setForm({ ...promotion, discountInput: promotion.discountType === "fixed" ? (promotion.discountValue / 100).toFixed(2).replace(".", ",") : String(promotion.discountValue) });
    window.scrollTo({ top: 440, behavior: "smooth" });
  }
  function toggleService(id: string) {
    setForm((current) => ({ ...current, serviceIds: current.serviceIds.includes(id) ? current.serviceIds.filter((item) => item !== id) : [...current.serviceIds, id] }));
  }
  async function submitPromotion(event: FormEvent) {
    event.preventDefault(); setSaving(true); setError(""); setFeedback("");
    const raw = Number(form.discountInput.replace(/\./g, "").replace(",", "."));
    const discountValue = form.discountType === "fixed" ? Math.round(raw * 100) : form.discountType === "combo" ? 0 : Math.round(raw);
    try {
      const response = await fetch("/api/admin/marketing", { method: form.id ? "PATCH" : "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...form, discountValue }) });
      const payload = await response.json(); if (!response.ok) throw new Error(payload.message ?? "Falha ao salvar.");
      setFeedback(payload.message); setForm(emptyPromotion); await load();
    } catch (reason) { setError(reason instanceof Error ? reason.message : "Falha ao salvar."); } finally { setSaving(false); }
  }
  async function adjustLoyalty(event: FormEvent) {
    event.preventDefault(); setSaving(true); setError(""); setFeedback("");
    try {
      const response = await fetch("/api/admin/marketing", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ resource: "loyalty", clientId, kind, pointsDelta: Number(points), stampsDelta: Number(stamps), referralsDelta: Number(referrals), description }) });
      const payload = await response.json(); if (!response.ok) throw new Error(payload.message ?? "Falha ao salvar.");
      setFeedback(payload.message); setDescription(""); setPoints("0"); setStamps("1"); setReferrals("0"); await load();
    } catch (reason) { setError(reason instanceof Error ? reason.message : "Falha ao salvar."); } finally { setSaving(false); }
  }

  if (!data && !error) return <div className="admin-loading">Carregando promoções e fidelidade...</div>;
  return <section className="marketing-module">
    <div className="admin-panel-heading"><div><span>Relacionamento</span><h2>Promoções e fidelidade</h2></div><p>Campanhas com período real e benefícios registrados no histórico da cliente.</p></div>
    {feedback && <p className="admin-feedback">{feedback}</p>}{error && <p className="admin-feedback error">{error}</p>}
    {data && <>
      <div className="marketing-layout">
        <form className="admin-service-form marketing-form" onSubmit={submitPromotion}>
          <div className="finance-form-title"><span>{form.id ? "Editar campanha" : "Nova campanha"}</span><h3>{form.id ? "Atualizar promoção" : "Criar promoção"}</h3></div>
          <label>Título<input value={form.title} onChange={(event) => setForm({ ...form, title: event.target.value })} required /></label>
          <label>Descrição<textarea value={form.description} onChange={(event) => setForm({ ...form, description: event.target.value })} required /></label>
          <div className="admin-form-grid"><label>Tipo<select value={form.discountType} onChange={(event) => setForm({ ...form, discountType: event.target.value })}><option value="percentage">Percentual</option><option value="fixed">Valor fixo</option><option value="combo">Combo de serviços</option></select></label><label>{form.discountType === "fixed" ? "Desconto (R$)" : form.discountType === "combo" ? "Sem valor obrigatório" : "Desconto (%)"}<input inputMode="decimal" value={form.discountInput} onChange={(event) => setForm({ ...form, discountInput: event.target.value })} disabled={form.discountType === "combo"} required={form.discountType !== "combo"} /></label></div>
          <div className="admin-form-grid"><label>Início<input type="date" value={form.startDate} onChange={(event) => setForm({ ...form, startDate: event.target.value })} required /></label><label>Fim<input type="date" value={form.endDate} onChange={(event) => setForm({ ...form, endDate: event.target.value })} required /></label></div>
          <div className="admin-form-grid"><label>Público<select value={form.audience} onChange={(event) => setForm({ ...form, audience: event.target.value })}>{Object.entries(audienceLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label><label>Cupom<input value={form.couponCode ?? ""} onChange={(event) => setForm({ ...form, couponCode: event.target.value })} placeholder="BELEZA10" /></label></div>
          {form.discountType === "combo" && <label>Descrição do combo<textarea value={form.comboDescription ?? ""} onChange={(event) => setForm({ ...form, comboDescription: event.target.value })} /></label>}
          <fieldset className="marketing-services"><legend>Serviços participantes</legend><div>{data.services.map((service) => <label key={service.id}><input type="checkbox" checked={form.serviceIds.includes(service.id)} onChange={() => toggleService(service.id)} />{service.name}</label>)}</div></fieldset>
          <div className="admin-form-grid"><label className="admin-toggle"><input type="checkbox" checked={form.featured} onChange={(event) => setForm({ ...form, featured: event.target.checked })} />Destaque</label><label className="admin-toggle"><input type="checkbox" checked={form.active} onChange={(event) => setForm({ ...form, active: event.target.checked })} />Ativa</label></div>
          <div className="finance-form-actions">{form.id && <button className="text-button" type="button" onClick={() => setForm(emptyPromotion)}>Cancelar edição</button>}<button className="button button-gold" disabled={saving}><span>{saving ? "Salvando..." : "Salvar promoção"}</span><b>→</b></button></div>
        </form>
        <div className="admin-panel marketing-list"><div className="finance-toolbar"><div><span>Campanhas</span><h3>Promoções cadastradas</h3></div><small>{data.promotions.filter((item) => item.active).length} ativas</small></div>{data.promotions.length ? data.promotions.map((promotion) => <article key={promotion.id} className={promotion.active ? "" : "inactive"}><div><span>{audienceLabels[promotion.audience]} · {promotion.startDate.split("-").reverse().join("/")} a {promotion.endDate.split("-").reverse().join("/")}</span><h4>{promotion.title}</h4><p>{promotion.description}</p>{promotion.couponCode && <code>{promotion.couponCode}</code>}</div><div><strong>{discountLabel(promotion)}</strong><small>{promotion.active ? "Ativa" : "Inativa"}</small><button className="text-button" type="button" onClick={() => edit(promotion)}>Editar</button></div></article>) : <p className="admin-empty-state">Nenhuma promoção cadastrada.</p>}</div>
      </div>
      <section className="loyalty-admin admin-panel"><div className="admin-panel-heading"><div><span>Programa de fidelidade</span><h2>Pontos, carimbos e indicações</h2></div><p>Cada ajuste fica registrado e nunca apaga o histórico anterior.</p></div><form onSubmit={adjustLoyalty}><label>Cliente<select value={clientId} onChange={(event) => setClientId(event.target.value)} required><option value="">Selecione</option>{data.clients.map((client) => <option key={client.id} value={client.id}>{client.name} · {client.loyalty.points} pts · {client.loyalty.stamps} carimbos</option>)}</select></label><label>Motivo<select value={kind} onChange={(event) => setKind(event.target.value)}><option value="service">Atendimento</option><option value="referral">Indicação</option><option value="birthday">Aniversário</option><option value="redemption">Resgate</option><option value="adjustment">Ajuste</option></select></label><label>Pontos<input type="number" value={points} onChange={(event) => setPoints(event.target.value)} /></label><label>Carimbos<input type="number" value={stamps} onChange={(event) => setStamps(event.target.value)} /></label><label>Indicações<input type="number" value={referrals} onChange={(event) => setReferrals(event.target.value)} /></label><label>Descrição<input value={description} onChange={(event) => setDescription(event.target.value)} required /></label><button className="button button-gold" disabled={saving}><span>Registrar benefício</span><b>→</b></button></form>
        <div className="loyalty-client-list"><input placeholder="Buscar cliente" value={query} onChange={(event) => setQuery(event.target.value)} />{filteredClients.slice(0, 12).map((client) => <article key={client.id}><div><strong>{client.name}</strong><small>{client.phone}</small></div><span>{client.loyalty.points} pts</span><span>{client.loyalty.stamps} carimbos</span><span>{client.loyalty.referrals} indicações</span></article>)}</div>
      </section>
    </>}
  </section>;
}
