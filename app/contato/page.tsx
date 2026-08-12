import type { Metadata } from "next";
/* eslint-disable @next/next/no-html-link-for-pages -- navegação pública preserva o padrão visual. */
import { getPublicSettings } from "../../lib/public-settings";
import { PublicAddress, PublicBrand, PublicInstagramLink, PublicMapLink, PublicStudioName, PublicWhatsappLink } from "../public-settings";

export async function generateMetadata(): Promise<Metadata> {
  const settings = await getPublicSettings();
  return { title: `Contato | ${settings.salonName}`, description: `Entre em contato com ${settings.salonName}, consulte horários e agende seu atendimento.` };
}

export default function ContactPage() {
  return <main className="contact-page">
    <header className="site-header"><PublicBrand /><nav className="main-nav" aria-label="Navegação principal"><a href="/">Início</a><a href="/servicos">Serviços</a><a href="/trabalhos">Trabalhos</a><a href="/#studio">O studio</a><a className="active" href="/contato">Contato</a><a href="/minha-conta">Minha conta</a></nav><a className="header-cta" href="/agendar">Agendar horário <span>↗</span></a></header>
    <section className="contact-hero"><div><p className="eyebrow">Vamos conversar <span>✦</span></p><h1>Seu próximo<br /><em>momento começa aqui.</em></h1><p>Tem uma dúvida, quer fazer uma avaliação ou já sabe qual cuidado deseja? Fale com a gente. Será um prazer receber você.</p></div><div className="contact-mark"><span>JBS</span><small>BEAUTY<br />STUDIO</small></div></section>
    <section className="contact-grid"><div className="contact-main">
      <div className="contact-card contact-card-gold"><span className="contact-card-label">WhatsApp</span><h2>O jeito mais rápido<br /><em>de falar com a gente.</em></h2><p>Respondemos dúvidas, enviamos orientações e encontramos o melhor horário para você.</p><PublicWhatsappLink className="button button-dark">Abrir conversa <span>↗</span></PublicWhatsappLink></div>
      <div className="contact-card contact-address"><span className="contact-card-label">Onde estamos</span><h2><PublicAddress /></h2><p>Atendimento com hora marcada</p><PublicMapLink /></div>
    </div><aside className="contact-side">
      <div className="contact-detail"><span>Horários</span><p>Consulte os horários disponíveis<br /><strong>diretamente na agenda</strong></p></div>
      <div className="contact-detail"><span>Fale também por</span><p><PublicWhatsappLink /><br /><a href="mailto:oi@jaquelinebeauty.com">oi@jaquelinebeauty.com</a></p></div>
      <div className="contact-detail"><span>Redes sociais</span><p><PublicInstagramLink /><br /><PublicWhatsappLink>WhatsApp ↗</PublicWhatsappLink></p></div>
    </aside></section>
    <section className="contact-bottom"><p className="eyebrow">Antes de vir <span>✦</span></p><h2>Reserve um tempo<br /><em>só seu.</em></h2><p>Para que a experiência seja tranquila, chegamos a cada atendimento com tudo preparado para você. Se for sua primeira visita, conte um pouco sobre o que deseja no WhatsApp.</p><PublicWhatsappLink className="outline-link">Falar com o studio <span>↗</span></PublicWhatsappLink></section>
    <footer className="site-footer"><div className="footer-bottom"><span>© 2026 <PublicStudioName /></span><span>Atendimento com hora marcada</span><a href="#top">Voltar ao topo ↑</a></div></footer>
  </main>;
}
