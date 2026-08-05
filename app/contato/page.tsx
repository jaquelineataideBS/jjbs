import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Contato | Jaqueline Beauty Studio",
  description: "Entre em contato com o Jaqueline Beauty Studio, consulte horários e agende seu atendimento.",
};

const whatsapp = "https://wa.me/5500000000000";

export default function ContactPage() {
  return (
    <main className="contact-page">
      <header className="site-header">
        <a className="brand" href="/" aria-label="Jaqueline Beauty Studio - início"><span className="brand-mark">J</span><span><strong>Jaqueline</strong><small>Beauty Studio</small></span></a>
        <nav className="main-nav" aria-label="Navegação principal"><a href="/">Início</a><a href="/servicos">Serviços</a><a href="/trabalhos">Trabalhos</a><a href="/#studio">O studio</a><a className="active" href="/contato">Contato</a></nav>
        <a className="header-cta" href="/#agendar">Agendar horário <span>↗</span></a>
      </header>

      <section className="contact-hero">
        <div><p className="eyebrow">Vamos conversar <span>✦</span></p><h1>Seu próximo<br /><em>momento começa aqui.</em></h1><p>Tem uma dúvida, quer fazer uma avaliação ou já sabe qual cuidado deseja? Fale com a gente. Será um prazer receber você.</p></div>
        <div className="contact-mark"><span>JBS</span><small>BEAUTY<br />STUDIO</small></div>
      </section>

      <section className="contact-grid">
        <div className="contact-main">
          <div className="contact-card contact-card-gold"><span className="contact-card-label">WhatsApp</span><h2>O jeito mais rápido<br /><em>de falar com a gente.</em></h2><p>Respondemos dúvidas, enviamos orientações e encontramos o melhor horário para você.</p><a className="button button-dark" href={whatsapp} target="_blank" rel="noreferrer">Abrir conversa <span>↗</span></a></div>
          <div className="contact-card contact-address"><span className="contact-card-label">Onde estamos</span><h2>Rua da Beleza, 120</h2><p>Fortaleza · Ceará<br />Atendimento com hora marcada</p><a className="text-link dark-link" href="https://maps.google.com/?q=Rua+da+Beleza+120+Fortaleza" target="_blank" rel="noreferrer">Abrir no mapa <span>↗</span></a></div>
        </div>
        <aside className="contact-side">
          <div className="contact-detail"><span>Horários</span><p>Segunda a sexta<br /><strong>09h — 19h</strong></p><p>Sábado<br /><strong>09h — 17h</strong></p></div>
          <div className="contact-detail"><span>Fale também por</span><p><a href="tel:+5585999990000">(85) 99999-0000</a><br /><a href="mailto:oi@jaquelinebeauty.com">oi@jaquelinebeauty.com</a></p></div>
          <div className="contact-detail"><span>Redes sociais</span><p><a href="https://instagram.com" target="_blank" rel="noreferrer">Instagram ↗</a><br /><a href={whatsapp} target="_blank" rel="noreferrer">WhatsApp ↗</a></p></div>
        </aside>
      </section>

      <section className="contact-bottom"><p className="eyebrow">Antes de vir <span>✦</span></p><h2>Reserve um tempo<br /><em>só seu.</em></h2><p>Para que a experiência seja tranquila, chegamos a cada atendimento com tudo preparado para você. Se for sua primeira visita, conte um pouco sobre o que deseja no WhatsApp.</p><a className="outline-link" href={whatsapp} target="_blank" rel="noreferrer">Falar com o studio <span>↗</span></a></section>
      <footer className="site-footer"><div className="footer-bottom"><span>© 2026 Jaqueline Beauty Studio</span><span>Seg–Sáb · 09h às 19h</span><a href="#top">Voltar ao topo ↑</a></div></footer>
    </main>
  );
}
