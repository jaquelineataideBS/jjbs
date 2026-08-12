"use client";

/* eslint-disable @next/next/no-html-link-for-pages -- a navegação pública preserva o padrão do site existente. */

import { useEffect, useState } from "react";
import { PublicBrand } from "../public-settings";

type Promotion = {
  id: string;
  title: string;
  description: string;
  discountType: string;
  discountValue: number;
  couponCode: string | null;
  audience: string;
  comboDescription: string | null;
  endDate: string;
  featured: boolean;
  services: string[];
};
const audienceLabels: Record<string, string> = {
  all: "Para você",
  birthday: "Aniversariantes",
  first_visit: "Primeira visita",
  off_peak: "Horários especiais",
};
function benefit(item: Promotion) {
  if (item.discountType === "combo") return "Combo";
  if (item.discountType === "percentage") return `${item.discountValue}% OFF`;
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(item.discountValue / 100);
}

export default function PromotionsPage() {
  const [items, setItems] = useState<Promotion[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  useEffect(() => {
    fetch("/api/promotions", { cache: "no-store" })
      .then(async (response) => {
        const payload = await response.json();
        if (!response.ok) throw new Error(payload.message);
        setItems(payload.promotions ?? []);
      })
      .catch((reason) => setError(reason.message))
      .finally(() => setLoading(false));
  }, []);
  return (
    <main className="promotions-page">
      <header className="inner-header">
        <PublicBrand />
        <nav>
          <a href="/">Início</a>
          <a href="/servicos">Serviços</a>
          <a href="/trabalhos">Trabalhos</a>
          <a href="/minha-conta">Minha conta</a>
        </nav>
        <a className="header-cta" href="/agendar">
          Agendar horário <span>↗</span>
        </a>
      </header>
      <section className="promotions-hero">
        <p className="eyebrow">
          Campanhas especiais <span>✦</span>
        </p>
        <h1>
          Um cuidado a mais,
          <br />
          <em>para você.</em>
        </h1>
        <p>
          Condições criadas pelo studio para transformar seu próximo atendimento
          em uma experiência ainda mais especial.
        </p>
      </section>
      <section className="promotion-public-grid">
        {loading ? (
          <p className="promotion-state">Carregando promoções...</p>
        ) : error ? (
          <p className="promotion-state">{error}</p>
        ) : items.length ? (
          items.map((item) => (
            <article key={item.id} className={item.featured ? "featured" : ""}>
              <span>{audienceLabels[item.audience]}</span>
              <strong>{benefit(item)}</strong>
              <h2>{item.title}</h2>
              <p>{item.description}</p>
              {item.comboDescription && (
                <p className="combo-copy">{item.comboDescription}</p>
              )}
              {item.services.length > 0 && (
                <small>{item.services.join(" · ")}</small>
              )}
              {item.couponCode && (
                <div className="coupon-public">
                  <span>Cupom</span>
                  <code>{item.couponCode}</code>
                </div>
              )}
              <footer>
                <span>
                  Válida até {item.endDate.split("-").reverse().join("/")}
                </span>
                <a href="/agendar">Quero aproveitar →</a>
              </footer>
            </article>
          ))
        ) : (
          <p className="promotion-state">
            Novas experiências especiais serão anunciadas em breve.
          </p>
        )}
      </section>
    </main>
  );
}
