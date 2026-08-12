import type { MetadataRoute } from "next";
import { getPublicSettings } from "../lib/public-settings";

export default async function manifest(): Promise<MetadataRoute.Manifest> {
  const settings = await getPublicSettings();
  return {
    name: settings.salonName,
    short_name: settings.salonName.replace(/Beauty Studio$/i, "").trim().slice(0, 24) || "Studio",
    description: `Agendamentos e cuidados de ${settings.salonName}.`,
    start_url: "/",
    scope: "/",
    id: "/",
    display: "standalone",
    orientation: "portrait-primary",
    background_color: settings.primaryColor,
    theme_color: settings.primaryColor,
    lang: "pt-BR",
    icons: [
      { src: "/pwa-icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/pwa-icon-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
