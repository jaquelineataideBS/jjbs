"use client";

/* eslint-disable @next/next/no-img-element, @next/next/no-html-link-for-pages -- o preview público preserva os links nativos do layout existente. */

import { useEffect, useMemo, useState } from "react";

type WorkItem = {
  id: string;
  title: string;
  description: string;
  category: string;
  mainImageUrl: string;
  beforeImageUrl: string | null;
  afterImageUrl: string | null;
  featured: boolean;
};

function messageOf(value: unknown, fallback: string) {
  return typeof value === "object" &&
    value &&
    "message" in value &&
    typeof value.message === "string"
    ? value.message
    : fallback;
}

export default function WorksPage() {
  const [items, setItems] = useState<WorkItem[]>([]);
  const [activeFilter, setActiveFilter] = useState("Todos");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    void (async () => {
      try {
        const response = await fetch("/api/portfolio", { cache: "no-store" });
        const result: unknown = await response.json().catch(() => ({}));
        if (!response.ok)
          throw new Error(
            messageOf(result, "Não foi possível carregar a galeria."),
          );
        setItems(
          typeof result === "object" &&
            result &&
            "items" in result &&
            Array.isArray(result.items)
            ? (result.items as WorkItem[])
            : [],
        );
      } catch (cause) {
        setError(
          cause instanceof Error
            ? cause.message
            : "Não foi possível carregar a galeria.",
        );
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const filters = useMemo(
    () => ["Todos", ...Array.from(new Set(items.map((item) => item.category)))],
    [items],
  );
  const visibleItems = useMemo(
    () =>
      activeFilter === "Todos"
        ? items
        : items.filter((item) => item.category === activeFilter),
    [activeFilter, items],
  );

  return (
    <main className="works-page">
      <header className="site-header">
        <a
          className="brand"
          href="/"
          aria-label="Jaqueline Justino Beauty Studio - início"
        >
          <span className="brand-symbol" aria-hidden="true">
            <img src="/jaqueline-justino-monogram.png?v=1" alt="" />
          </span>
          <span className="brand-name">
            <strong>Jaqueline Justino</strong>
            <small>Beauty Studio</small>
          </span>
        </a>
        <nav className="main-nav" aria-label="Navegação principal">
          <a href="/">Início</a>
          <a href="/servicos">Serviços</a>
          <a className="active" href="/trabalhos">
            Trabalhos
          </a>
          <a href="/#studio">O studio</a>
          <a href="/contato">Contato</a>
          <a href="/minha-conta">Minha conta</a>
        </nav>
        <a className="header-cta" href="/agendar">
          Agendar horário <span>↗</span>
        </a>
      </header>

      <section className="works-hero">
        <div>
          <p className="eyebrow">
            Feito por nós <span>✦</span>
          </p>
          <h1>
            Resultados que
            <br />
            <em>falam por si.</em>
          </h1>
          <p>
            Uma seleção de transformações, detalhes e momentos vividos no
            Jaqueline Beauty Studio.
          </p>
        </div>
        <div className="works-hero-note">
          <span>✦</span>
          <p>
            Seu próximo
            <br />
            <em>resultado está aqui.</em>
          </p>
        </div>
      </section>

      <section className="works-gallery" aria-label="Galeria de trabalhos">
        <div className="works-toolbar">
          <p>
            Inspire-se <span>·</span>{" "}
            {visibleItems.length.toString().padStart(2, "0")} resultados
          </p>
          <div className="filter-list" aria-label="Filtrar trabalhos">
            {filters.map((filter) => (
              <button
                className={
                  activeFilter === filter ? "filter-chip active" : "filter-chip"
                }
                key={filter}
                onClick={() => setActiveFilter(filter)}
                aria-pressed={activeFilter === filter}
              >
                {filter}
              </button>
            ))}
          </div>
        </div>
        {error ? (
          <div className="works-empty">
            <h2>Galeria indisponível.</h2>
            <p>{error}</p>
          </div>
        ) : loading ? (
          <div className="works-empty">
            <h2>Preparando inspirações…</h2>
            <p>Carregando os trabalhos do studio.</p>
          </div>
        ) : visibleItems.length ? (
          <div className="works-grid">
            {visibleItems.map((item, index) => (
              <article
                className={`work-card work-card-${(index % 3) + 1}`}
                key={item.id}
              >
                <div className="work-image">
                  <img src={item.mainImageUrl} alt={item.title} />
                  <span className="work-number">
                    {String(index + 1).padStart(2, "0")}
                  </span>
                </div>
                <div className="work-info">
                  <p>{item.category}</p>
                  <h2>{item.title}</h2>
                  <span>{item.description}</span>
                  {item.beforeImageUrl && item.afterImageUrl && (
                    <small className="work-before-after">
                      Antes e depois disponível
                    </small>
                  )}
                  <a href="/agendar">
                    Quero um resultado assim <b>↗</b>
                  </a>
                </div>
              </article>
            ))}
          </div>
        ) : (
          <div className="works-empty">
            <h2>Nenhum trabalho nesta categoria.</h2>
            <p>Escolha outra categoria ou volte em breve.</p>
          </div>
        )}
      </section>

      <section className="works-cta">
        <p className="eyebrow">
          Agora é a sua vez <span>✦</span>
        </p>
        <h2>
          Vamos criar algo
          <br />
          <em>que tenha a sua cara?</em>
        </h2>
        <a className="button button-gold" href="/agendar">
          Agendar meu horário <span>↗</span>
        </a>
      </section>
      <footer className="site-footer">
        <div className="footer-bottom">
          <span>© 2026 Jaqueline Beauty Studio</span>
          <span>Seg–Sáb · 09h às 19h</span>
          <a href="#top">Voltar ao topo ↑</a>
        </div>
      </footer>
    </main>
  );
}
