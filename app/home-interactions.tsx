"use client";

import { useEffect } from "react";

/** Motion enhances the server-rendered page; content never depends on it. */
export default function HomeInteractions() {
  useEffect(() => {
    const root = document.querySelector<HTMLElement>(".studio-home");
    if (!root) return;
    const preference = window.matchMedia("(prefers-reduced-motion: reduce)");
    const animations = new Set<Animation>();
    const observer = new IntersectionObserver((entries) => {
      for (const entry of entries) {
        if (!entry.isIntersecting) continue;
        observer.unobserve(entry.target);
        if (preference.matches) continue;
        const animation = entry.target.animate(
          [{ opacity: 0, transform: "translateY(22px)" }, { opacity: 1, transform: "translateY(0)" }],
          { duration: 700, easing: "cubic-bezier(.22,1,.36,1)" },
        );
        animations.add(animation);
        animation.onfinish = () => animations.delete(animation);
      }
    }, { threshold: 0.08 });
    root.querySelectorAll(".home-section-top, .home-service, .home-about > div, .home-work-grid > a, .home-booking > div, .home-faq > div, .home-footer-top > *").forEach(element => observer.observe(element));
    const closeMenu = (event: MouseEvent) => {
      if ((event.target as HTMLElement).closest(".home-menu a")) root.querySelector<HTMLDetailsElement>(".home-menu")?.removeAttribute("open");
    };
    const stopMotion = () => { if (preference.matches) animations.forEach(animation => animation.cancel()); };
    root.addEventListener("click", closeMenu);
    preference.addEventListener("change", stopMotion);
    return () => {
      observer.disconnect();
      animations.forEach(animation => animation.cancel());
      root.removeEventListener("click", closeMenu);
      preference.removeEventListener("change", stopMotion);
    };
  }, []);
  return null;
}
