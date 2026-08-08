import type { Metadata } from "next";

/* eslint-disable @next/next/no-html-link-for-pages -- o preview usa links nativos nas páginas públicas. */

export const metadata: Metadata = {
  title: "Serviços | Jaqueline Beauty Studio",
  description: "Conheça os serviços de cabelo, coloração, tratamentos e penteados do Jaqueline Beauty Studio.",
};

const categories = [
  {
    id: "cabelos",
    label: "01 / Cabelos & cortes",
    title: "Cortes que acompanham a sua vida.",
    description: "Formas pensadas para o seu rosto, sua textura e o jeito como você gosta de se ver no espelho.",
    image: "https://images.unsplash.com/photo-1521590832167-7bcbfaa6381f?auto=format&fit=crop&w=1000&q=85",
    services: [
      ["Corte feminino", "R$ 120", "1h"],
      ["Corte + finalização", "R$ 150", "1h30"],
      ["Corte masculino", "R$ 75", "45 min"],
      ["Escova modelada", "R$ 85", "1h"],
    ],
  },
  {
    id: "coloracao",
    label: "02 / Coloração & mechas",
    title: "Cor com profundidade.",
    description: "Técnica, luminosidade e uma leitura cuidadosa dos seus fios para criar uma cor que parece sua.",
    image: "https://images.unsplash.com/photo-1522337360788-8b13dee7a37e?auto=format&fit=crop&w=1000&q=85",
    services: [
      ["Morena iluminada", "A partir de R$ 420", "3h"],
      ["Mechas / luzes", "A partir de R$ 480", "4h"],
      ["Retoque de raiz", "A partir de R$ 180", "2h"],
      ["Tonalização", "A partir de R$ 140", "1h30"],
    ],
  },
  {
    id: "tratamentos",
    label: "03 / Tratamentos",
    title: "Cuidado que se sente.",
    description: "Protocolos escolhidos para devolver movimento, maciez e força ao cabelo de dentro para fora.",
    image: "https://images.unsplash.com/photo-1516975080664-ed2fc6a32937?auto=format&fit=crop&w=1000&q=85",
    services: [
      ["Hidratação profunda", "R$ 160", "1h30"],
      ["Reconstrução", "R$ 180", "1h30"],
      ["Terapia capilar", "R$ 220", "2h"],
      ["Cronograma capilar", "Sob consulta", "Avaliação"],
    ],
  },
  {
    id: "producoes",
    label: "04 / Produções",
    title: "Para os dias que merecem mais.",
    description: "Penteados e finalizações com presença para celebrações, eventos e momentos importantes.",
    image: "https://images.unsplash.com/photo-1487412947147-5cebf100ffc2?auto=format&fit=crop&w=1000&q=85",
    services: [
      ["Penteado social", "A partir de R$ 180", "2h"],
      ["Penteado para noivas", "Sob consulta", "Avaliação"],
      ["Produção para evento", "A partir de R$ 260", "3h"],
      ["Tranças e coques", "A partir de R$ 150", "1h30"],
    ],
  },
];

export default function ServicesPage() {
  return (
    <main className="catalog-page">
      <header className="site-header">
        <a className="brand" href="/" aria-label="Jaqueline Justino Beauty Studio - início">
          <span className="brand-symbol" aria-hidden="true"><img src="/jaqueline-justino-monogram.png?v=1" alt="" /></span>
          <span className="brand-name"><strong>Jaqueline Justino</strong><small>Beauty Studio</small></span>
        </a>
        <nav className="main-nav" aria-label="Navegação principal">
          <a href="/">Início</a><a className="active" href="/servicos">Serviços</a><a href="/trabalhos">Trabalhos</a><a href="/#studio">O studio</a><a href="/contato">Contato</a><a href="/minha-conta">Minha conta</a>
        </nav>
        <a className="header-cta" href="/agendar">Agendar horário <span>↗</span></a>
      </header>

      <section className="catalog-hero">
        <div>
          <p className="eyebrow">O menu de cuidados <span>✦</span></p>
          <h1>Escolha o que<br /><em>faz sentido para você.</em></h1>
          <p>Do corte à transformação completa, cada serviço começa com escuta e termina com um resultado que tem a sua cara.</p>
        </div>
        <div className="catalog-index" aria-label="Categorias de serviços">
          {categories.map((category) => <a href={`#${category.id}`} key={category.id}><span>{category.label.split(" /")[0]}</span>{category.label.split(" / ")[1]} <i>↘</i></a>)}
        </div>
      </section>

      <section className="catalog-list">
        {categories.map((category, index) => (
          <article className="catalog-category" id={category.id} key={category.id}>
            <div className="category-image"><img src={category.image} alt="" /></div>
            <div className="category-content">
              <p className="eyebrow">{category.label} <span>✦</span></p>
              <h2>{category.title}</h2>
              <p className="category-description">{category.description}</p>
              <div className="service-list">
                {category.services.map(([name, price, duration]) => <a href="/agendar" className="service-row" key={name}><span>{name}</span><small>{duration}</small><strong>{price}</strong><i>↗</i></a>)}
              </div>
              <a className="button button-gold" href="/agendar">Agendar este cuidado <span>↗</span></a>
            </div>
            <span className="category-index">0{index + 1}</span>
          </article>
        ))}
      </section>

      <section className="catalog-note">
        <p className="eyebrow">Uma conversa antes de tudo <span>✦</span></p>
        <h2>Não sabe qual escolher?<br /><em>A gente te orienta.</em></h2>
        <p>Alguns procedimentos dependem do comprimento, volume e histórico do cabelo. Fale com a gente para receber uma indicação personalizada.</p>
        <a className="outline-link" href="https://wa.me/5500000000000" target="_blank" rel="noreferrer">Conversar pelo WhatsApp <span>↗</span></a>
      </section>

      <footer className="site-footer">
        <div className="footer-bottom"><span>© 2026 Jaqueline Beauty Studio</span><span>Seg–Sáb · 09h às 19h</span><a href="#top">Voltar ao topo ↑</a></div>
      </footer>
    </main>
  );
}
