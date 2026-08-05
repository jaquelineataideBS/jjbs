"use client";

import { useMemo, useState } from "react";

const workItems = [
  { image: "https://images.unsplash.com/photo-1522337360788-8b13dee7a37e?auto=format&fit=crop&w=1100&q=85", category: "Coloração", title: "Morena iluminada com dimensão", detail: "Coloração global · Brilho natural" },
  { image: "https://images.unsplash.com/photo-1521590832167-7bcbfaa6381f?auto=format&fit=crop&w=1100&q=85", category: "Cortes", title: "Camadas que dão movimento", detail: "Corte feminino · Finalização" },
  { image: "https://images.unsplash.com/photo-1516975080664-ed2fc6a32937?auto=format&fit=crop&w=1100&q=85", category: "Tratamentos", title: "Brilho e toque renovados", detail: "Hidratação profunda · Terapia capilar" },
  { image: "https://images.unsplash.com/photo-1487412947147-5cebf100ffc2?auto=format&fit=crop&w=1100&q=85", category: "Produções", title: "Presença para uma noite especial", detail: "Penteado social · Produção" },
  { image: "https://images.unsplash.com/photo-1526045478516-99145907023c?auto=format&fit=crop&w=1100&q=85", category: "Coloração", title: "Luz suave, resultado elegante", detail: "Mechas · Tonalização" },
  { image: "https://images.unsplash.com/photo-1595476108010-b4d1f102b1b1?auto=format&fit=crop&w=1100&q=85", category: "Tratamentos", title: "Cuidado para fios danificados", detail: "Reconstrução · Cronograma" },
];

const filters = ["Todos", "Cortes", "Coloração", "Tratamentos", "Produções"];

export default function WorksPage() {
  const [activeFilter, setActiveFilter] = useState("Todos");
  const visibleItems = useMemo(() => activeFilter === "Todos" ? workItems : workItems.filter((item) => item.category === activeFilter), [activeFilter]);

  return (
    <main className="works-page">
      <header className="site-header">
        <a className="brand" href="/" aria-label="Jaqueline Beauty Studio - início"><span className="brand-mark">J</span><span><strong>Jaqueline</strong><small>Beauty Studio</small></span></a>
        <nav className="main-nav" aria-label="Navegação principal"><a href="/">Início</a><a href="/servicos">Serviços</a><a className="active" href="/trabalhos">Trabalhos</a><a href="/#studio">O studio</a><a href="/contato">Contato</a></nav>
        <a className="header-cta" href="/#agendar">Agendar horário <span>↗</span></a>
      </header>

      <section className="works-hero">
        <div><p className="eyebrow">Feito por nós <span>✦</span></p><h1>Resultados que<br /><em>falam por si.</em></h1><p>Uma seleção de transformações, detalhes e momentos vividos no Jaqueline Beauty Studio.</p></div>
        <div className="works-hero-note"><span>✦</span><p>Seu próximo<br /><em>resultado está aqui.</em></p></div>
      </section>

      <section className="works-gallery" aria-label="Galeria de trabalhos">
        <div className="works-toolbar"><p>Inspire-se <span>·</span> {visibleItems.length.toString().padStart(2, "0")} resultados</p><div className="filter-list" aria-label="Filtrar trabalhos">{filters.map((filter) => <button className={activeFilter === filter ? "filter-chip active" : "filter-chip"} key={filter} onClick={() => setActiveFilter(filter)} aria-pressed={activeFilter === filter}>{filter}</button>)}</div></div>
        <div className="works-grid">{visibleItems.map((item, index) => <article className={`work-card work-card-${(index % 3) + 1}`} key={item.title}><div className="work-image"><img src={item.image} alt={item.title} /><span className="work-number">0{index + 1}</span></div><div className="work-info"><p>{item.category}</p><h2>{item.title}</h2><span>{item.detail}</span><a href="/#agendar">Quero um resultado assim <b>↗</b></a></div></article>)}</div>
      </section>

      <section className="works-cta"><p className="eyebrow">Agora é a sua vez <span>✦</span></p><h2>Vamos criar algo<br /><em>que tenha a sua cara?</em></h2><a className="button button-gold" href="/#agendar">Agendar meu horário <span>↗</span></a></section>
      <footer className="site-footer"><div className="footer-bottom"><span>© 2026 Jaqueline Beauty Studio</span><span>Seg–Sáb · 09h às 19h</span><a href="#top">Voltar ao topo ↑</a></div></footer>
    </main>
  );
}
