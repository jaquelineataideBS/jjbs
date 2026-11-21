"use client";
import { useEffect, useState } from "react";

type Review = {
  id: string;
  clientName: string;
  serviceName: string | null;
  overallRating: number;
  comment: string | null;
  adminResponse: string | null;
};

export default function ReviewsHighlight() {
  const [items, setItems] = useState<Review[]>([]);

  useEffect(() => {
    fetch("/api/reviews")
      .then((response) => (response.ok ? response.json() : { reviews: [] }))
      .then((data) => setItems((data.reviews ?? []).slice(0, 3)))
      .catch(() => undefined);
  }, []);

  if (!items.length) return null;

  return (
    <section
      className="home-reviews home-section"
      aria-labelledby="home-reviews-title"
    >
      <div className="home-section-top">
        <div>
          <span className="home-reviews-eyebrow">Experiências reais</span>
          <h2 id="home-reviews-title">O cuidado também se conta.</h2>
        </div>
        <p>Avaliações de quem já viveu um momento de cuidado no studio.</p>
      </div>
      <div className="home-review-carousel">
        {items.map((item, index) => (
          <article className={index === 0 ? "home-review-featured" : undefined} key={item.id}>
            {index === 0 && <span className="home-review-featured-label">Avaliação em destaque</span>}
            {item.comment ? (
              <blockquote>“{item.comment}”</blockquote>
            ) : (
              <p className="home-review-no-comment">Avaliação sem comentário</p>
            )}
            <div className="home-review-meta">
              <span
                className="home-review-stars"
                role="img"
                aria-label={`${item.overallRating} de 5 estrelas`}
              >
                {"★".repeat(item.overallRating)}
                {"☆".repeat(5 - item.overallRating)}
              </span>
              <p>
                {item.clientName}
                {item.serviceName ? ` · ${item.serviceName}` : ""}
              </p>
            </div>
            {item.adminResponse && (
              <small>Resposta do studio: {item.adminResponse}</small>
            )}
          </article>
        ))}
      </div>
    </section>
  );
}
