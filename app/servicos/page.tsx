import type { Metadata } from "next";
import { asc, eq } from "drizzle-orm";
import { getDb } from "../../db";
import { serviceCategories, services } from "../../db/schema";
import { getPublicSettings } from "../../lib/public-settings";
import { PublicBrand, PublicStudioName, PublicWhatsappLink } from "../public-settings";

/* eslint-disable @next/next/no-html-link-for-pages -- public navigation follows the existing native-link flow. */
export const dynamic = "force-dynamic";
export async function generateMetadata(): Promise<Metadata> {
  const settings = await getPublicSettings();
  return { title: `Serviços | ${settings.salonName}`, description: `Conheça os serviços e valores de ${settings.salonName}.` };
}
async function loadCatalog() {
  try {
    const db = await getDb();
    const rows = await db.select({ id: services.id, name: services.name, description: services.description, duration: services.durationMinutes, price: services.priceCents, priceType: services.priceType, categoryId: serviceCategories.id, category: serviceCategories.name })
      .from(services).leftJoin(serviceCategories, eq(serviceCategories.id, services.categoryId))
      .where(eq(services.active, true)).orderBy(asc(serviceCategories.displayOrder), asc(services.name));
    const groups = new Map<string, { id: string; name: string; services: typeof rows }>();
    for (const service of rows) {
      const key = service.categoryId || "outros";
      if (!groups.has(key)) groups.set(key, { id: key, name: service.category || "Cuidados do studio", services: [] });
      groups.get(key)!.services.push(service);
    }
    return { groups: [...groups.values()], error: false };
  } catch { return { groups: [], error: true }; }
}
export default async function ServicesPage() {
  const { groups, error } = await loadCatalog();
  return <main className="catalog-page" id="top">
    <header className="site-header"><PublicBrand /><nav className="main-nav" aria-label="Navegação principal"><a href="/">Início</a><a href="/servicos" aria-current="page">Serviços</a><a href="/trabalhos">Trabalhos</a><a href="/contato">Contato</a><a href="/minha-conta">Minha conta</a></nav><a className="header-cta" href="/agendar">Agendar horário ↗</a></header>
    <section className="catalog-hero"><div><h1>O cuidado<br />que é seu.</h1><p>Conheça os serviços do studio, confira os valores e escolha o seu próximo atendimento.</p></div>{groups.length > 0 && <nav className="catalog-index" aria-label="Categorias de serviços">{groups.map(group => <a href={`#categoria-${group.id}`} key={group.id}>{group.name} <i aria-hidden="true">↓</i></a>)}</nav>}</section>
    <section className="live-catalog" aria-label="Serviços disponíveis">
      {groups.map(group => <section className="live-catalog-category" id={`categoria-${group.id}`} key={group.id} aria-labelledby={`titulo-${group.id}`}><h2 id={`titulo-${group.id}`}>{group.name}</h2><div>{group.services.map(service => <article key={service.id}><div><h3>{service.name}</h3><p>{service.description}</p></div><div className="live-service-details"><span>{service.duration >= 60 ? `${Math.floor(service.duration / 60)}h${service.duration % 60 ? String(service.duration % 60).padStart(2, "0") : ""}` : `${service.duration} min`}</span><strong>{service.price === null ? "Sob consulta" : `${service.priceType === "starting_at" ? "A partir de " : ""}${new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(service.price / 100)}`}</strong><a className="button button-gold" href={`/agendar?service=${encodeURIComponent(service.id)}`}>Agendar serviço ↗</a></div></article>)}</div></section>)}
      {!groups.length && <div className="catalog-empty" role={error ? "status" : undefined}><h2>{error ? "Vamos tentar novamente?" : "Seu cuidado começa com uma conversa."}</h2><p>{error ? "Não foi possível consultar os serviços agora. Tente novamente ou fale com o studio." : "Entre em contato para consultar os atendimentos disponíveis."}</p><PublicWhatsappLink className="button">Falar com o studio ↗</PublicWhatsappLink></div>}
    </section>
    <section className="catalog-note"><h2>Qual serviço escolher?</h2><p>Conte para o studio o que você deseja para o seu cabelo. Vamos orientar sua escolha antes do agendamento.</p><PublicWhatsappLink className="outline-link">Conversar pelo WhatsApp ↗</PublicWhatsappLink></section>
    <footer className="site-footer"><div className="footer-bottom"><span>© {new Date().getFullYear()} <PublicStudioName /></span><a href="/privacidade">Privacidade</a><a href="#top">Voltar ao topo ↑</a></div></footer>
  </main>;
}
