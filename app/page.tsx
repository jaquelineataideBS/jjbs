const services = [
  {
    number: "01",
    name: "Morena iluminada",
    description: "Dimensão, brilho e um resultado sofisticado que respeita a sua identidade.",
    duration: "A partir de 3h",
    price: "R$ 420",
  },
  {
    number: "02",
    name: "Corte & finalização",
    description: "Um corte pensado para o seu rosto, sua rotina e o movimento natural dos fios.",
    duration: "Até 1h30",
    price: "R$ 120",
  },
  {
    number: "03",
    name: "Tratamento de alta performance",
    description: "Cuidado profundo para devolver maciez, força e luminosidade aos cabelos.",
    duration: "Até 1h30",
    price: "R$ 160",
  },
];

const portfolio = [
  {
    image: "https://images.unsplash.com/photo-1522337360788-8b13dee7a37e?auto=format&fit=crop&w=900&q=85",
    category: "Coloração",
    title: "Luz que acompanha o movimento",
  },
  {
    image: "https://images.unsplash.com/photo-1521590832167-7bcbfaa6381f?auto=format&fit=crop&w=900&q=85",
    category: "Corte",
    title: "Leveza para todos os dias",
  },
  {
    image: "https://images.unsplash.com/photo-1516975080664-ed2fc6a32937?auto=format&fit=crop&w=900&q=85",
    category: "Tratamento",
    title: "Brilho, toque e cuidado",
  },
];

export default function Home() {
  return (
    <main>
      <header className="site-header">
        <a className="brand" href="#inicio" aria-label="Jaqueline Justino Beauty Studio - início">
          <span className="brand-symbol" aria-hidden="true"><img src="/jaqueline-justino-monogram.png?v=1" alt="" /></span>
          <span className="brand-name"><strong>Jaqueline Justino</strong><small>Beauty Studio</small></span>
        </a>

        <nav className="main-nav" aria-label="Navegação principal">
          <a href="#inicio">Início</a>
          <a href="/servicos">Serviços</a>
          <a href="/trabalhos">Trabalhos</a>
          <a href="#studio">O studio</a>
          <a href="/contato">Contato</a>
          <a href="/minha-conta">Minha conta</a>
        </nav>

        <a className="header-cta" href="/agendar">Agendar horário <span>↗</span></a>
      </header>

      <section className="hero" id="inicio">
        <div className="hero-copy">
          <p className="eyebrow">Beleza com intenção <span>✦</span></p>
          <h1>Seu cabelo,<br /><em>sua assinatura.</em></h1>
          <p className="hero-text">
            Um studio para viver o cuidado com calma, técnica e um olhar que enxerga a sua beleza de verdade.
          </p>
          <div className="hero-actions">
            <a className="button button-gold" href="/agendar">Agendar meu horário <span>↗</span></a>
            <a className="text-link" href="/servicos">Conhecer serviços <span>→</span></a>
          </div>
          <div className="hero-proof">
            <div className="avatar-stack" aria-hidden="true">
              <span>J</span><span>R</span><span>M</span>
            </div>
            <p><strong>+500 clientes</strong><br />já viveram essa experiência</p>
          </div>
        </div>

        <div className="hero-visual">
          <div className="hero-photo-wrap">
            <img src="/jaqueline-justino-hero.png" alt="Jaqueline Justino, proprietária do Jaqueline Justino Beauty Studio, no studio de beleza" />
          </div>
          <div className="hero-note">
            <span className="note-star">✦</span>
            <p>Jaqueline Justino<br /><em>proprietária & especialista.</em></p>
          </div>
          <div className="hero-stamp" aria-label="Jaqueline Justino Beauty Studio"><span className="hero-stamp-symbol" aria-hidden="true"><img src="/jaqueline-justino-monogram.png?v=1" alt="" /></span></div>
        </div>
      </section>

      <section className="quick-links" aria-label="Acessos rápidos">
        <a href="/agendar"><span>01</span><strong>Agendar horário</strong><i>↗</i></a>
        <a href="/servicos"><span>02</span><strong>Explorar serviços</strong><i>↗</i></a>
        <a href="/trabalhos"><span>03</span><strong>Ver trabalhos</strong><i>↗</i></a>
        <a href="https://wa.me/5500000000000" target="_blank" rel="noreferrer"><span>04</span><strong>Falar no WhatsApp</strong><i>↗</i></a>
      </section>

      <section className="section services-section" id="servicos">
        <div className="section-heading">
          <div>
            <p className="eyebrow">O que fazemos <span>✦</span></p>
            <h2>Serviços para<br /><em>realçar o essencial.</em></h2>
          </div>
          <p className="section-intro">Cada atendimento começa com uma conversa. Porque o melhor resultado é aquele que combina com você.</p>
        </div>

        <div className="services-grid">
          {services.map((service) => (
            <article className="service-card" key={service.number}>
              <div className="service-top"><span>{service.number}</span><span>✦</span></div>
              <h3>{service.name}</h3>
              <p>{service.description}</p>
              <div className="service-meta"><span>{service.duration}</span><strong>{service.price}</strong></div>
              <a className="service-link" href="/agendar">Ver detalhes <span>↗</span></a>
            </article>
          ))}
        </div>
        <a className="outline-link" href="/servicos">Ver todos os serviços <span>↗</span></a>
      </section>

      <section className="experience-band" id="studio">
        <div className="experience-photo">
          <img src="https://images.unsplash.com/photo-1519699047748-de8e457a634e?auto=format&fit=crop&w=1000&q=85" alt="Detalhe de atendimento em studio de beleza" />
        </div>
        <div className="experience-copy">
          <p className="eyebrow">A experiência JBS <span>✦</span></p>
          <h2>Mais do que um<br /><em>resultado bonito.</em></h2>
          <p>O studio nasceu para ser um respiro na rotina. Um espaço íntimo, acolhedor e técnico, onde cada detalhe foi pensado para que você saia se sentindo ainda mais você.</p>
          <div className="values-row"><span>01 <b>Escuta</b></span><span>02 <b>Técnica</b></span><span>03 <b>Cuidado</b></span></div>
          <a className="text-link" href="#contato">Conhecer o studio <span>→</span></a>
        </div>
      </section>

      <section className="section portfolio-section" id="trabalhos">
        <div className="section-heading portfolio-heading">
          <div>
            <p className="eyebrow">Feito por nós <span>✦</span></p>
            <h2>Trabalhos que<br /><em>falam por si.</em></h2>
          </div>
          <a className="outline-link" href="/trabalhos">Ver galeria completa <span>↗</span></a>
        </div>
        <div className="portfolio-grid">
          {portfolio.map((item, index) => (
            <a className={`portfolio-item portfolio-item-${index + 1}`} href="/agendar" key={item.title}>
              <img src={item.image} alt={item.title} />
              <div className="portfolio-overlay"><span>{item.category}</span><strong>{item.title}</strong><i>↗</i></div>
            </a>
          ))}
        </div>
      </section>

      <section className="quote-section">
        <span className="quote-mark">“</span>
        <blockquote>Saí me sentindo linda, leve e muito mais segura de mim. O cuidado em cada detalhe faz toda a diferença.</blockquote>
        <p>Mariana, cliente JBS <span>✦✦✦✦✦</span></p>
      </section>

      <section className="booking-cta" id="agendar">
        <div><p className="eyebrow">Seu próximo momento <span>✦</span></p><h2>Começa aqui.</h2></div>
        <div className="booking-actions"><p>Escolha seu serviço e encontre um horário que combine com a sua rotina.</p><a className="button button-gold" href="/agendar">Começar agendamento <span>↗</span></a></div>
      </section>

      <footer className="site-footer" id="contato">
        <div className="footer-top">
          <div><a className="brand footer-brand" href="#inicio"><span className="brand-symbol" aria-hidden="true"><img src="/jaqueline-justino-monogram.png?v=1" alt="" /></span><span className="brand-name"><strong>Jaqueline Justino</strong><small>Beauty Studio</small></span></a><p>Beleza, cuidado e transformação<br />em cada detalhe.</p></div>
          <div className="footer-column"><span>Visite o studio</span><p>Rua da Beleza, 120<br />Fortaleza · CE</p></div>
          <div className="footer-column"><span>Fale com a gente</span><p>(85) 99999-0000<br /><a href="mailto:oi@jaquelinebeauty.com">oi@jaquelinebeauty.com</a></p></div>
          <div className="footer-column"><span>Redes</span><p><a href="#contato">Instagram ↗</a><br /><a href="https://wa.me/5500000000000">WhatsApp ↗</a></p></div>
        </div>
        <div className="footer-bottom"><span>© 2026 Jaqueline Justino Beauty Studio</span><span>Seg–Sáb · 09h às 19h</span><a href="#inicio">Voltar ao topo ↑</a></div>
      </footer>
      <a className="floating-whatsapp" href="https://wa.me/5500000000000" target="_blank" rel="noreferrer" aria-label="Falar com Jaqueline Justino Beauty Studio pelo WhatsApp">◔</a>
    </main>
  );
}
