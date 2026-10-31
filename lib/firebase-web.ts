export const firebaseWebConfig = {
  apiKey: "AIzaSyCMcYuuhBBDjbSRvURqoKixUshB0EAtzOk",
  authDomain: "jaquelinebeauty-4d5d7.firebaseapp.com",
  projectId: "jaquelinebeauty-4d5d7",
  storageBucket: "jaquelinebeauty-4d5d7.firebasestorage.app",
  messagingSenderId: "770512446472",
  appId: "1:770512446472:web:9749efc73ba4a6e0869dbd",
};

export const firebaseVapidKey = process.env.NEXT_PUBLIC_FIREBASE_VAPID_KEY ?? "";

export type ForegroundPush = { title: string; body: string; url: string };

async function messagingClient() {
  const [{ getApps, initializeApp }, messaging] = await Promise.all([
    import("firebase/app"),
    import("firebase/messaging"),
  ]);
  const app = getApps().find((current) => current.name === "jaqueline-beauty-web-push") ??
    initializeApp(firebaseWebConfig, "jaqueline-beauty-web-push");
  return { messaging, client: messaging.getMessaging(app) };
}

async function registerServiceWorker() {
  const registration = await navigator.serviceWorker.register(
    "/fcm/firebase-messaging-sw.js",
    { scope: "/fcm/", updateViaCache: "none" },
  );
  if (!registration.active) {
    const worker = registration.installing ?? registration.waiting;
    if (worker) {
      await new Promise<void>((resolve, reject) => {
        const timeout = window.setTimeout(() => reject(new Error("O serviço de notificações demorou para iniciar.")), 20000);
        worker.addEventListener("statechange", () => {
          if (worker.state === "activated") {
            window.clearTimeout(timeout);
            resolve();
          } else if (worker.state === "redundant") {
            window.clearTimeout(timeout);
            reject(new Error("Não foi possível iniciar o serviço de notificações."));
          }
        });
      });
    }
  }
  return registration;
}

export async function registerPushInstallation() {
  if (!firebaseVapidKey) throw new Error("O Firebase ainda precisa da chave Web Push do projeto.");
  if (!("Notification" in window) || !("serviceWorker" in navigator)) {
    throw new Error("Este navegador não oferece suporte a notificações push.");
  }
  if (Notification.permission !== "granted") throw new Error("Permita notificações no navegador para continuar.");

  const [{ client }, service] = await Promise.all([
    messagingClient(),
    import("firebase/messaging"),
  ]);
  if (!(await service.isSupported())) throw new Error("Este navegador não oferece suporte ao Firebase Cloud Messaging.");
  const serviceWorkerRegistration = await registerServiceWorker();

  let stopListening: () => void = () => {};
  let resolveInstallation!: (fid: string) => void;
  const installation = new Promise<string>((resolve) => { resolveInstallation = resolve; });
  stopListening = service.onRegistered(client, (fid) => resolveInstallation(fid));
  const timeout = window.setTimeout(() => resolveInstallation(""), 20000);
  try {
    await service.register(client, { vapidKey: firebaseVapidKey, serviceWorkerRegistration });
    const fid = await installation;
    if (!fid) throw new Error("O Firebase não retornou o identificador deste dispositivo.");
    const response = await fetch("/api/account/push-installations", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ fid }),
    });
    const result: unknown = await response.json().catch(() => ({}));
    if (!response.ok) {
      const message = typeof result === "object" && result && "message" in result && typeof result.message === "string"
        ? result.message
        : "Não foi possível salvar este dispositivo.";
      throw new Error(message);
    }
    return fid;
  } finally {
    window.clearTimeout(timeout);
    stopListening();
  }
}

export async function unregisterPushInstallation(fid: string) {
  const response = await fetch("/api/account/push-installations", {
    method: "DELETE",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ fid }),
  });
  if (!response.ok) throw new Error("Não foi possível desativar as notificações neste dispositivo.");
  const [{ client }, service] = await Promise.all([messagingClient(), import("firebase/messaging")]);
  await service.unregister(client);
}

export async function listenForForegroundPush(onPush: (message: ForegroundPush) => void) {
  if (!firebaseVapidKey || !("Notification" in window)) return () => undefined;
  const [{ client }, service] = await Promise.all([messagingClient(), import("firebase/messaging")]);
  if (!(await service.isSupported())) return () => undefined;
  return service.onMessage(client, (payload) => onPush({
    title: payload.data?.title ?? "Jaqueline Beauty Studio",
    body: payload.data?.body ?? "Você recebeu uma nova notificação.",
    url: payload.data?.url ?? "/minha-conta#notificacoes",
  }));
}
