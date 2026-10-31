const CACHE_NAME = "jbs-app-v4";
const APP_SHELL = ["/offline.html", "/pwa-icon-192.png", "/pwa-icon-512.png"];

self.addEventListener("install", event => {
  event.waitUntil(caches.open(CACHE_NAME).then(cache => cache.addAll(APP_SHELL)).then(() => self.skipWaiting()));
});
self.addEventListener("activate", event => {
  event.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(key => key.startsWith("jbs-app-") && key !== CACHE_NAME).map(key => caches.delete(key)))).then(() => self.clients.claim()));
});
self.addEventListener("message", event => {
  if (event.data?.type === "SKIP_WAITING") void self.skipWaiting();
});
async function networkFirst(request) {
  try { return await fetch(request, { cache: "no-store" }); }
  catch { return await caches.match("/offline.html") ?? Response.error(); }
}
self.addEventListener("fetch", event => {
  const request = event.request;
  const url = new URL(request.url);
  if (request.method !== "GET" || url.origin !== self.location.origin || url.pathname.startsWith("/api/")) return;
  if (request.mode === "navigate") {
    event.respondWith(networkFirst(request));
    return;
  }
  // Only content-addressed Next assets are safe to reuse across deployments.
  if (url.pathname.startsWith("/_next/static/") && /\/[\w.-]*[0-9a-f]{8,}[\w.-]*\.(?:js|css|woff2?)$/i.test(url.pathname)) {
    event.respondWith(caches.open(CACHE_NAME).then(async cache => {
      const cached = await cache.match(request);
      if (cached) return cached;
      const response = await fetch(request);
      if (response.ok) await cache.put(request, response.clone());
      return response;
    }));
  }
  // RSC payloads, mutable photos and all other requests use the network normally.
});
