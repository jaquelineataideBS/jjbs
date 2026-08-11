"use client";

import { useEffect, useState } from "react";
import Image from "next/image";

type InstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

const DISMISS_KEY = "jbs-pwa-install-dismissed-at";
const DISMISS_FOR_MS = 7 * 24 * 60 * 60 * 1000;

function isStandalone() {
  return window.matchMedia("(display-mode: standalone)").matches ||
    ("standalone" in navigator && Boolean((navigator as Navigator & { standalone?: boolean }).standalone));
}

export default function PwaInstallInvitation() {
  const [installPrompt, setInstallPrompt] = useState<InstallPromptEvent | null>(null);
  const [show, setShow] = useState(false);
  const [isIos, setIsIos] = useState(false);

  useEffect(() => {
    if (window.location.pathname.startsWith("/admin") || isStandalone()) return;

    void navigator.serviceWorker?.register("/sw.js").catch(() => undefined);

    const isMobile = window.matchMedia("(max-width: 820px)").matches || /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
    if (!isMobile) return;

    const dismissedAt = Number(window.localStorage.getItem(DISMISS_KEY) ?? 0);
    if (dismissedAt && Date.now() - dismissedAt < DISMISS_FOR_MS) return;

    const iosDevice = /iPhone|iPad|iPod/i.test(navigator.userAgent);
    const handleInstallPrompt = (event: Event) => {
      event.preventDefault();
      setInstallPrompt(event as InstallPromptEvent);
      setShow(true);
    };
    const handleInstalled = () => {
      setShow(false);
      window.localStorage.removeItem(DISMISS_KEY);
    };

    window.addEventListener("beforeinstallprompt", handleInstallPrompt);
    window.addEventListener("appinstalled", handleInstalled);

    const inviteTimer = window.setTimeout(() => {
      setIsIos(iosDevice);
      setShow(true);
    }, iosDevice ? 900 : 1400);

    return () => {
      window.removeEventListener("beforeinstallprompt", handleInstallPrompt);
      window.removeEventListener("appinstalled", handleInstalled);
      window.clearTimeout(inviteTimer);
    };
  }, []);

  function dismiss() {
    window.localStorage.setItem(DISMISS_KEY, String(Date.now()));
    setShow(false);
  }

  async function install() {
    if (!installPrompt) return;
    await installPrompt.prompt();
    const choice = await installPrompt.userChoice;
    if (choice.outcome === "accepted") setShow(false);
    else dismiss();
    setInstallPrompt(null);
  }

  if (!show) return null;

  return (
    <aside className="pwa-install-card" role="dialog" aria-modal="true" aria-labelledby="pwa-install-title">
      <button className="pwa-install-close" type="button" onClick={dismiss} aria-label="Fechar convite de instalação">×</button>
      <Image src="/pwa-icon-192.png" alt="" width={64} height={64} priority />
      <div>
        <span>Jaqueline Beauty Studio</span>
        <h2 id="pwa-install-title">Tenha nosso app no seu celular</h2>
        <p>{isIos ? "Toque em Compartilhar e depois em “Adicionar à Tela de Início”." : installPrompt ? "Instale para acessar agendamentos e novidades com mais facilidade." : "Abra o menu do navegador e escolha “Instalar aplicativo” ou “Adicionar à tela inicial”."}</p>
        <div className="pwa-install-actions">
          {installPrompt ? <button className="button button-gold" type="button" onClick={() => void install()}>Instalar app <b>→</b></button> : <button className="pwa-install-understood" type="button" onClick={dismiss}>Entendi</button>}
          <button className="text-button" type="button" onClick={dismiss}>Agora não</button>
        </div>
      </div>
    </aside>
  );
}
