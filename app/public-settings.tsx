"use client";

import { createContext, useContext, useEffect, useState } from "react";
import type { CSSProperties, ReactNode } from "react";
import type { PublicSettings } from "../lib/public-settings";
import { instagramHref, whatsappHref } from "../lib/public-links";
import { formatWhatsapp } from "../lib/masks";

const SettingsContext = createContext<PublicSettings | null>(null);

export function PublicSettingsProvider({
  initial,
  children,
}: {
  initial: PublicSettings;
  children: ReactNode;
}) {
  const [settings, setSettings] = useState(initial);

  useEffect(() => {
    const refresh = () =>
      void fetch("/api/settings", { cache: "no-store" })
        .then(async (response) => (response.ok ? response.json() : null))
        .then((payload) => {
          if (payload?.settings)
            setSettings((current) => ({ ...current, ...payload.settings }));
        })
        .catch(() => undefined);
    refresh();
    window.addEventListener("focus", refresh);
    return () => window.removeEventListener("focus", refresh);
  }, []);

  const style = {
    "--black": settings.primaryColor,
    "--gold": settings.accentColor,
  } as CSSProperties;
  return (
    <SettingsContext.Provider value={settings}>
      <div className="public-settings-root" style={style}>
        {children}
      </div>
    </SettingsContext.Provider>
  );
}

export function usePublicSettings() {
  const settings = useContext(SettingsContext);
  if (!settings) throw new Error("PublicSettingsProvider ausente.");
  return settings;
}

export function PublicBrand({
  className = "brand",
  href = "/",
}: {
  className?: string;
  href?: string;
}) {
  const settings = usePublicSettings();
  const displayName =
    settings.salonName.replace(/Beauty Studio$/i, "").trim() ||
    settings.salonName;
  return (
    <a
      className={className}
      href={href}
      aria-label={`${settings.salonName} - início`}
    >
      <span className="brand-symbol" aria-hidden="true">
        <img
          src={settings.logoUrl || "/jaqueline-justino-monogram.png?v=1"}
          alt=""
        />
      </span>
      <span className="brand-name">
        <strong>{displayName}</strong>
        <small>Beauty Studio</small>
      </span>
    </a>
  );
}

export function PublicStudioName() {
  return <>{usePublicSettings().salonName}</>;
}

export function PublicAddress({ fallback = "Endereço disponível por WhatsApp" }: { fallback?: string }) {
  return <>{usePublicSettings().address || fallback}</>;
}

export function PublicWhatsappLink({ children, className }: { children?: ReactNode; className?: string }) {
  const settings = usePublicSettings();
  return <a className={className} href={whatsappHref(settings.whatsapp)} target="_blank" rel="noreferrer">{children || formatWhatsapp(settings.whatsapp || "") || "WhatsApp"}</a>;
}

export function PublicInstagramLink({ children = "Instagram ↗" }: { children?: ReactNode }) {
  const settings = usePublicSettings();
  return <a href={instagramHref(settings.instagram)} target="_blank" rel="noreferrer">{children}</a>;
}

export function PublicMapLink() {
  const settings = usePublicSettings();
  const href = settings.address ? `https://maps.google.com/?q=${encodeURIComponent(settings.address)}` : "/contato";
  return <a className="text-link dark-link" href={href} target={settings.address ? "_blank" : undefined} rel={settings.address ? "noreferrer" : undefined}>Abrir no mapa <span>↗</span></a>;
}
