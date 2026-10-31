"use client";

import { useEffect, useState } from "react";

export default function PwaUpdateManager() {
  const [available, setAvailable] = useState(false);
  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;
    // An older installed worker may still control localhost and serve stale
    // development chunks, causing hydration to restore an outdated screen.
    if (process.env.NODE_ENV !== "production") {
      const controlled = Boolean(navigator.serviceWorker.controller);
      void navigator.serviceWorker.getRegistrations().then(async registrations => {
        const removed = await Promise.all(registrations
          .filter(value => new URL(value.scope).origin === window.location.origin)
          .map(value => value.unregister()));
        const keys = await caches.keys();
        await Promise.all(keys.filter(key => key.startsWith("jbs-app-")).map(key => caches.delete(key)));
        if (controlled && removed.some(Boolean)) window.location.reload();
      }).catch(() => undefined);
      return;
    }
    let disposed = false;
    let registration: ServiceWorkerRegistration | undefined;
    const hadController = Boolean(navigator.serviceWorker.controller);
    const changed = () => { if (hadController && !disposed) setAvailable(true); };
    const check = () => {
      if (document.visibilityState === "visible") void registration?.update().catch(() => undefined);
    };
    navigator.serviceWorker.addEventListener("controllerchange", changed);
    void navigator.serviceWorker.register("/sw.js", { updateViaCache: "none" }).then(value => {
      if (disposed) return;
      registration = value;
      void registration.update().catch(() => undefined);
      registration.waiting?.postMessage({ type: "SKIP_WAITING" });
    }).catch(() => undefined);
    window.addEventListener("focus", check);
    document.addEventListener("visibilitychange", check);
    const timer = window.setInterval(check, 5 * 60 * 1000);
    return () => {
      disposed = true;
      window.clearInterval(timer);
      window.removeEventListener("focus", check);
      document.removeEventListener("visibilitychange", check);
      navigator.serviceWorker.removeEventListener("controllerchange", changed);
    };
  }, []);
  if (!available) return null;
  return <aside className="app-update-notice" role="status">
    <div><strong>Uma nova versão está pronta.</strong><p>Conclua suas alterações e atualize para continuar.</p></div>
    <button type="button" onClick={() => window.location.reload()}>Atualizar app</button>
  </aside>;
}
