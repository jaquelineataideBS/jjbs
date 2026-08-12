const CACHE_NAME = "jbs-app-v2";
const APP_SHELL = ["/", "/manifest.webmanifest", "/pwa-icon-192.png", "/pwa-icon-512.png"];

self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(CACHE_NAME).then((cache) => cache.addAll(APP_SHELL)));
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    Promise.all([
      caches.keys().then((keys) => Promise.all(keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key)))),
      self.clients.claim(),
    ]),
  );
});

self.addEventListener("message", (event) => {
  if (event.data?.type === "SKIP_WAITING") self.skipWaiting();
});

async function networkFirst(request, fallbackUrl, cacheResponse = true) {
  try {
    const response = await fetch(request, { cache: "no-store" });
    if (cacheResponse && response.ok) {
      const copy = response.clone();
      void caches.open(CACHE_NAME).then((cache) => cache.put(request, copy));
    }
    return response;
  } catch {
    return await caches.match(request) ?? (fallbackUrl ? await caches.match(fallbackUrl) : undefined) ?? Response.error();
  }
}

self.addEventListener("fetch", (event) => {
  const requestUrl = new URL(event.request.url);
  if (event.request.method !== "GET" || requestUrl.origin !== self.location.origin || requestUrl.pathname.startsWith("/api/")) return;

  if (event.request.mode === "navigate") {
    const fallbackUrl = requestUrl.pathname.startsWith("/admin") ? undefined : "/";
    event.respondWith(networkFirst(event.request, fallbackUrl, false));
    return;
  }

  if (["image", "font"].includes(event.request.destination)) {
    event.respondWith(
      caches.match(event.request).then((cached) => cached ?? networkFirst(event.request)),
    );
    return;
  }

  event.respondWith(networkFirst(event.request));
});
