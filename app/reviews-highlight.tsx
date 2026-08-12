"use client";
import { useEffect, useState } from "react";
import { usePublicSettings } from "./public-settings";
type Review = {
  id: string;
  clientName: string;
  serviceName: string | null;
  overallRating: number;
  comment: string;
  adminResponse: string | null;
};
export default function ReviewsHighlight() {
  const settings = usePublicSettings();
  const [items, setItems] = useState<Review[]>([]);
  useEffect(() => {
    fetch("/api/reviews")
      .then((r) => (r.ok ? r.json() : { reviews: [] }))
      .then((p) => setItems((p.reviews ?? []).slice(0, 3)))
      .catch(() => undefined);
  }, []);
  if (!items.length)
    return (
      <>
        <blockquote>
          “O cuidado nos detalhes transforma não só o cabelo, mas a forma como
          você se sente.”
        </blockquote>
        <p>Experiência {settings.salonName} <span>✦✦✦✦✦</span></p>
      </>
    );
  return (
    <div className="home-review-carousel">
      {items.map((item) => (
        <article key={item.id}>
          <blockquote>“{item.comment}”</blockquote>
          <p>
            {item.clientName}
            {item.serviceName ? ` · ${item.serviceName}` : ""}{" "}
            <span>{"✦".repeat(item.overallRating)}</span>
          </p>
          {item.adminResponse && (
            <small>Resposta do studio: {item.adminResponse}</small>
          )}
        </article>
      ))}
    </div>
  );
}
