import Link from "next/link";
import type { CSSProperties } from "react";
import { and, asc, eq } from "drizzle-orm";
import { getDb } from "../db";
import { portfolioItems, serviceCategories, services } from "../db/schema";
import { getPublicSettings } from "../lib/public-settings";
import { instagramHref, whatsappHref } from "../lib/public-links";
import HomeInteractions from "./home-interactions";
import "./home.css";

export const dynamic = "force-dynamic";

async function getHighlights() {
  try {
    const db = await getDb();
    const [serviceRows, workRows] = await Promise.all([
      db.select({ id: services.id, name: services.name, description: services.description, duration: services.durationMinutes, price: services.priceCents, priceType: services.priceType })
        .from(services).leftJoin(serviceCategories, eq(serviceCategories.id, services.categoryId)).where(eq(services.active, true)).orderBy(asc(serviceCategories.displayOrder), asc(services.name)).limit(3),
      db.select({ id: portfolioItems.id, image: portfolioItems.mainImageUrl, category: portfolioItems.category, title: portfolioItems.title })
        .from(portfolioItems).where(and(eq(portfolioItems.published, true), eq(portfolioItems.featured, true))).orderBy(asc(portfolioItems.displayOrder)).limit(3),
    ]);
    return { serviceRows, workRows: workRows.filter(work => !/^https?:\/\/(?:images\.)?unsplash\.com\//i.test(work.image)) };
  } catch {
    return { serviceRows: [], workRows: [] };
  }
}

export default async function Home() {
  const [settings, { serviceRows, workRows }] = await Promise.all([getPublicSettings(), getHighlights()]);
  const name = settings.salonName.replace(/Beauty Studio$/i, "").trim();
  const portrait = settings.bannerImageUrl || "/jaqueline-justino-hero.png";
  const whatsapp = whatsappHref(settings.whatsapp);
  return (
    <main className="studio-home" style={{ "--home-ink": settings.primaryColor, "--home-accent": settings.accentColor } as CSSProperties}>
      <HomeInteractions />
      <a className="home-skip" href="#conteudo">Ir para o conteúdo</a>
      <header className="home-header">
        <Link className="home-brand" href="/" aria-label={`${settings.salonName} — início`}>
          <img src={settings.logoUrl || "/jaqueline-justino-monogram.png"} alt="" width="42" height="50" />
          <span>{name}<small>Beauty Studio</small></span>
        </Link>
        <nav className="home-nav" aria-label="Navegação principal">
          <a href="/servicos">Serviços</a><a href="/trabalhos">Trabalhos</a><a href="#studio">O studio</a><a href="/contato">Contato</a>
        </nav>
        <a className="home-account" href="/minha-conta">Minha conta <span aria-hidden="true">↗</span></a>
        <details className="home-menu"><summary>Menu</summary><nav aria-label="Navegação no celular"><a href="/servicos">Serviços</a><a href="/trabalhos">Trabalhos</a><a href="#studio">O studio</a><a href="/contato">Contato</a><a href="/minha-conta">Minha conta</a></nav></details>
      </header>
      <section className="home-hero" id="conteudo" aria-labelledby="home-title">
        <div className="home-hero-copy">
          <h1 id="home-title">{settings.homepageHeadline || "Beleza com assinatura."}</h1>
          <p>{settings.homepageDescription || `${settings.salonName}: cabelo, cuidado e um olhar só para você. Um atendimento que começa com escuta e termina com o seu estilo.`}</p>
          <a className="home-button" href="/agendar">Agendar meu horário <span aria-hidden="true">↗</span></a>
          <a className="home-secondary" href="/servicos">Encontre seu cuidado <span aria-hidden="true">↓</span></a>
          <p className="home-hero-note">Do primeiro cuidado ao toque final, o seu estilo guia cada escolha.</p>
        </div>
        <figure className="home-portrait"><img src={portrait} alt={`${name} no Beauty Studio`} fetchPriority="high" /></figure>
      </section>
      <section className="home-services home-section" aria-labelledby="services-title">
        <div className="home-section-top"><h2 id="services-title">O seu próximo cuidado.</h2><a className="home-link" href="/servicos">Todos os serviços ↗</a></div>
        {serviceRows.length ? <div className="home-service-list">{serviceRows.map(service => <a href="/agendar" key={service.id} className="home-service"><h3>{service.name}</h3><p>{service.description}</p><div><span>{service.duration >= 60 ? `${Math.floor(service.duration / 60)}h${service.duration % 60 ? String(service.duration % 60).padStart(2, "0") : ""}` : `${service.duration} min`}</span><strong>{service.price === null ? "Sob consulta" : `${service.priceType === "starting_at" ? "A partir de " : ""}${new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(service.price / 100)}`}</strong></div><span className="home-service-arrow" aria-hidden="true">↗</span></a>)}</div> : <div className="home-service-empty"><p>Uma mudança de visual ou um momento de cuidado? Conheça os serviços e escolha o atendimento para você.</p><a className="home-button" href="/servicos">Explorar serviços ↗</a></div>}
      </section>
      <section className="home-about home-section" id="studio" aria-labelledby="studio-title">
        <div className="home-about-name"><img src={settings.logoUrl || "/jaqueline-justino-monogram.png"} alt="" loading="lazy" /><p>Seu estilo merece<br />um cuidado próprio.</p></div>
        <div><h2 id="studio-title">Antes do espelho,<br />uma conversa.</h2><p>O que você quer mudar? O que quer manter? Seu atendimento começa com espaço para falar sobre o seu cabelo, seu estilo e a sua rotina.</p><p>Da escolha do serviço ao acabamento, um cuidado pensado para acompanhar você também fora do studio.</p><a className="home-link" href={whatsapp}>Converse com o studio ↗</a></div>
      </section>
      {workRows.length > 0 && <section className="home-work home-section" aria-labelledby="work-title"><div className="home-section-top"><h2 id="work-title">Nossa assinatura.</h2><a className="home-link" href="/trabalhos">Ver todos os trabalhos ↗</a></div><div className={`home-work-grid${workRows.length < 3 ? " home-work-pair" : ""}`}>{workRows.map(work => <a href="/trabalhos" key={work.id}><figure><img src={work.image} alt={work.title || work.category || "Trabalho realizado no studio"} loading="lazy" /><figcaption><span>{work.title || work.category || "Conheça este resultado"}</span><span aria-hidden="true">↗</span></figcaption></figure>{work.title && work.category && work.title !== work.category && <p>{work.category}</p>}</a>)}</div></section>}
      <section className="home-booking home-section" aria-labelledby="booking-title"><div><h2 id="booking-title">Reserve um tempo<br />para você.</h2><p>Escolha seu serviço, consulte os horários e faça seu agendamento pelo app.</p></div><div><a className="home-button" href="/agendar">Escolher meu horário ↗</a><a className="home-secondary" href="/lista-de-espera">Não encontrou horário? Entre na lista de espera ↗</a></div></section>
      <section className="home-faq home-section" aria-labelledby="faq-title">
        <div><h2 id="faq-title">Pode chegar<br />sem dúvidas.</h2><p>O essencial para planejar a sua visita com tranquilidade.</p><a className="home-link" href={whatsapp}>Tire uma dúvida pelo WhatsApp ↗</a></div>
        <div className="home-faq-list">
          <details><summary>Como faço meu agendamento?<span aria-hidden="true">+</span></summary><p>Acesse o agendamento, escolha o serviço e consulte os horários disponíveis. Se não encontrar um horário para você, entre na lista de espera.</p><a href="/agendar">Consultar horários ↗</a></details>
          <details><summary>Ainda não sei qual serviço escolher.<span aria-hidden="true">+</span></summary><p>Converse com o studio antes de reservar. Conte o que você deseja para o seu cabelo para receber orientação sobre o atendimento.</p><a href={whatsapp}>Conversar pelo WhatsApp ↗</a></details>
          <details><summary>E se eu precisar cancelar?<span aria-hidden="true">+</span></summary><p>{settings.cancellationPolicy}</p></details>
        </div>
      </section>
      <footer className="home-footer"><div className="home-footer-top"><div><a className="home-footer-name" href="#conteudo">{name}<small>Beauty Studio</small></a><p>{settings.address || "Consulte a localização com o studio."}</p></div><nav aria-label="Links do studio"><a href="/promocoes">Promoções</a><a href="/trabalhos">Trabalhos</a><a href="/minha-conta">Minha conta</a></nav><nav aria-label="Contato e redes"><a href={whatsapp}>WhatsApp ↗</a>{settings.instagram && <a href={instagramHref(settings.instagram)} target="_blank" rel="noreferrer">Instagram ↗</a>}<a href="/contato">Fale com o studio ↗</a></nav></div><div className="home-footer-bottom"><span>© {new Date().getFullYear()} {settings.salonName}</span><a href="/privacidade">Privacidade</a><a href="#conteudo">Voltar ao início ↑</a></div></footer>
    </main>
  );
}
