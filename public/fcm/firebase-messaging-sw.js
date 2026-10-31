// Register click handling before FCM scripts so this app's route behavior stays authoritative.
self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const target = new URL(event.notification.data?.url || "/", self.location.origin);
  const safeUrl = target.origin === self.location.origin ? target.href : `${self.location.origin}/`;
  event.waitUntil(self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((windows) => {
    const current = windows.find((client) => new URL(client.url).origin === self.location.origin);
    if (current) return current.focus().then(() => current.navigate(safeUrl));
    return self.clients.openWindow(safeUrl);
  }));
});

importScripts("https://www.gstatic.com/firebasejs/13.1.0/firebase-app-compat.js");
importScripts("https://www.gstatic.com/firebasejs/13.1.0/firebase-messaging-compat.js");

firebase.initializeApp({
  apiKey: "AIzaSyCMcYuuhBBDjbSRvURqoKixUshB0EAtzOk",
  authDomain: "jaquelinebeauty-4d5d7.firebaseapp.com",
  projectId: "jaquelinebeauty-4d5d7",
  storageBucket: "jaquelinebeauty-4d5d7.firebasestorage.app",
  messagingSenderId: "770512446472",
  appId: "1:770512446472:web:9749efc73ba4a6e0869dbd",
});

const messaging = firebase.messaging();

messaging.onBackgroundMessage((payload) => {
  const title = payload.data?.title || "Jaqueline Beauty Studio";
  const url = new URL(payload.data?.url || "/", self.location.origin);
  const safeUrl = url.origin === self.location.origin ? `${url.pathname}${url.search}${url.hash}` : "/";
  return self.registration.showNotification(title, {
    body: payload.data?.body || "Você recebeu uma nova notificação.",
    icon: "/pwa-icon-192.png",
    badge: "/pwa-icon-192.png",
    data: { url: safeUrl },
  });
});
