"use client";

/* eslint-disable react-hooks/set-state-in-effect -- a preferência depende da sessão e do suporte do navegador. */

import { useCallback, useEffect, useState } from "react";
import {
  registerPushInstallation,
  unregisterPushInstallation,
} from "../lib/firebase-web";

type Props = { audience: "studio" | "client" };

export default function PushNotificationsControl({ audience }: Props) {
  const [ready, setReady] = useState(false);
  const [loading, setLoading] = useState(true);
  const [working, setWorking] = useState(false);
  const [marketingConsent, setMarketingConsent] = useState(false);
  const [fid, setFid] = useState("");
  const [permission, setPermission] = useState<NotificationPermission | "unsupported">("default");
  const [feedback, setFeedback] = useState("");
  const [isError, setIsError] = useState(false);

  const activate = useCallback(async (requestPermission: boolean) => {
    setWorking(true);
    try {
      if (!("Notification" in window)) throw new Error("Este navegador não oferece notificações push.");
      let currentPermission = Notification.permission;
      if (requestPermission && currentPermission === "default") currentPermission = await Notification.requestPermission();
      setPermission(currentPermission);
      if (currentPermission === "denied") throw new Error("As notificações estão bloqueadas nas permissões do navegador.");
      if (currentPermission !== "granted") throw new Error("Permita as notificações do site para ativá-las.");
      const installationId = await registerPushInstallation();
      setFid(installationId);
      setFeedback("Notificações ativadas neste dispositivo.");
      setIsError(false);
    } finally {
      setWorking(false);
    }
  }, []);

  useEffect(() => {
    let disposed = false;
    let stopForeground: (() => void) | undefined;
    setPermission("Notification" in window ? Notification.permission : "unsupported");
    void fetch("/api/account/push-installations", { cache: "no-store" })
      .then(async (response) => {
        const result: unknown = await response.json().catch(() => ({}));
        if (!response.ok) throw new Error("Não foi possível carregar as preferências de notificações.");
        if (disposed || typeof result !== "object" || !result) return;
        setReady("ready" in result && result.ready === true);
        setMarketingConsent("marketingConsent" in result && result.marketingConsent === true);
        setLoading(false);
        if ("Notification" in window && Notification.permission === "granted" &&
          (audience === "studio" || ("marketingConsent" in result && result.marketingConsent === true))) {
          void activate(false).catch(() => undefined);
          void import("../lib/firebase-web").then(({ listenForForegroundPush }) =>
            listenForForegroundPush((notice) => {
              if (disposed) return;
              setFeedback(`${notice.title}: ${notice.body}`);
              setIsError(false);
              window.dispatchEvent(new Event("jbs:notifications-updated"));
              window.setTimeout(() => { if (!disposed) setFeedback(""); }, 8000);
            }),
          ).then((unsubscribe) => { if (disposed) unsubscribe(); else stopForeground = unsubscribe; }).catch(() => undefined);
        }
      })
      .catch((reason: unknown) => {
        if (!disposed) {
          setFeedback(reason instanceof Error ? reason.message : "Não foi possível carregar as preferências.");
          setIsError(true);
          setLoading(false);
        }
      });
    return () => { disposed = true; stopForeground?.(); };
  }, [activate, audience]);

  async function setConsent(enabled: boolean) {
    setWorking(true);
    setFeedback("");
    try {
      const response = await fetch("/api/account/push-installations", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ marketingConsent: enabled }),
      });
      const result: unknown = await response.json().catch(() => ({}));
      if (!response.ok) {
        const message = typeof result === "object" && result && "message" in result && typeof result.message === "string" ? result.message : "Não foi possível salvar sua preferência.";
        throw new Error(message);
      }
      setMarketingConsent(enabled);
      setFeedback(enabled ? "Preferência de promoções salva." : "Você não receberá cupons e promoções por push.");
      setIsError(false);
    } catch (reason) {
      setFeedback(reason instanceof Error ? reason.message : "Não foi possível salvar sua preferência.");
      setIsError(true);
    } finally {
      setWorking(false);
    }
  }

  async function deactivate() {
    if (!fid) return;
    setWorking(true);
    setFeedback("");
    try {
      await unregisterPushInstallation(fid);
      setFid("");
      setFeedback("Notificações desativadas neste dispositivo.");
      setIsError(false);
    } catch (reason) {
      setFeedback(reason instanceof Error ? reason.message : "Não foi possível desativar.");
      setIsError(true);
    } finally {
      setWorking(false);
    }
  }

  return (
    <section className={`push-notifications-control ${audience === "studio" ? "push-notifications-studio" : "push-notifications-client"}`} aria-label="Preferências de notificações push">
      <div className="push-notifications-copy">
        <strong>{audience === "studio" ? "Avisos do studio neste dispositivo" : "Cupons e promoções por notificação"}</strong>
        <p>{audience === "studio" ? "Receba alertas de novos agendamentos." : "Ative para receber campanhas do studio mesmo quando o app estiver fechado."}</p>
      </div>
      {audience === "client" && (
        <label className="push-marketing-consent">
          <input type="checkbox" checked={marketingConsent} disabled={loading || working} onChange={(event) => void setConsent(event.target.checked)} />
          Aceito receber cupons e promoções por notificação. Posso desativar quando quiser.
        </label>
      )}
      {!ready ? (
        <small className="push-setup-note">Falta concluir a configuração Web Push do Firebase no ambiente do app.</small>
      ) : permission === "unsupported" ? (
        <small className="push-setup-note">Este navegador não oferece suporte a notificações push.</small>
      ) : fid ? (
        <button className="text-button" type="button" onClick={() => void deactivate()} disabled={working}>{working ? "Desativando…" : "Desativar neste dispositivo"}</button>
      ) : permission === "denied" ? (
        <small className="push-setup-note">Permissão bloqueada. Altere-a nas configurações do navegador.</small>
      ) : (
        <button className="text-button" type="button" onClick={() => void activate(true).catch((reason: unknown) => { setFeedback(reason instanceof Error ? reason.message : "Não foi possível ativar."); setIsError(true); })} disabled={loading || working || (audience === "client" && !marketingConsent)}>
          {working ? "Ativando…" : "Ativar notificações neste dispositivo"}
        </button>
      )}
      {feedback && <small className={isError ? "push-feedback error" : "push-feedback"} role={isError ? "alert" : "status"}>{feedback}</small>}
    </section>
  );
}
