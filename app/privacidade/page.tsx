"use client";
/* eslint-disable @next/next/no-html-link-for-pages -- navegação pública preserva o padrão visual. */
import { usePublicSettings } from "../public-settings";

export default function PrivacyPage() {
  const settings = usePublicSettings();
  return <main className="legal-page"><a href="/">← Voltar ao início</a><p className="eyebrow">Transparência e cuidado</p><h1>Política de <em>privacidade.</em></h1><div>{settings.privacyPolicy}</div><p>Para solicitar correção, exportação, anonimização ou exclusão dos seus dados, entre em contato diretamente com {settings.salonName}.</p></main>;
}
