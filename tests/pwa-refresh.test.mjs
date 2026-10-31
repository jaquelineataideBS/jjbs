import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import vm from "node:vm";

async function workerHarness({ networkFails = false, keys = [] } = {}) {
  const source = await readFile(new URL("../public/sw.js", import.meta.url), "utf8");
  const handlers = new Map();
  const deleted = [];
  const stored = new Map();
  const fetches = [];
  const cache = { addAll: async () => {}, match: async request => stored.get(typeof request === "string" ? request : request.url), put: async (request, response) => stored.set(request.url, response) };
  const context = { URL, Response, self: { location: { origin: "https://studio.test" }, clients: { claim: async () => {} }, skipWaiting: async () => {}, addEventListener: (event, handler) => handlers.set(event, handler) },
    caches: { open: async () => cache, keys: async () => keys, delete: async key => { deleted.push(key); }, match: async key => key === "/offline.html" ? new Response("Sem conexão") : undefined },
    fetch: async (request, options) => { fetches.push({ request, options }); if (networkFails) throw new Error("offline"); return new Response("rede atualizada"); } };
  vm.runInNewContext(source, context);
  const request = async (path, mode = "cors") => {
    let result;
    handlers.get("fetch")({ request: { url: `https://studio.test${path}`, method: "GET", mode }, respondWith: promise => { result = promise; } });
    return result ? await result : undefined;
  };
  return { handlers, request, deleted, fetches, stored };
}

test("navegação usa rede sem cache e não salva páginas autenticadas", async () => {
  const worker = await workerHarness();
  const response = await worker.request("/admin", "navigate");
  assert.equal(await response.text(), "rede atualizada");
  assert.equal(worker.fetches[0].options.cache, "no-store");
  assert.equal(worker.stored.size, 0);
});
test("API, fotos mutáveis e RSC não são interceptados pelo cache", async () => {
  const worker = await workerHarness();
  for (const path of ["/api/admin/clients", "/api/media/id", "/minha-conta?_rsc=123", "/logo.png", "/_next/static/chunks/app/admin/page.js"]) assert.equal(await worker.request(path), undefined);
  assert.equal(worker.fetches.length, 0);
});
test("somente assets versionados são reutilizados", async () => {
  const worker = await workerHarness();
  await worker.request("/_next/static/chunks/page-a1b2c3d4e5f6.js");
  await worker.request("/_next/static/chunks/page-a1b2c3d4e5f6.js");
  assert.equal(worker.fetches.length, 1);
});
test("sem rede usa página neutra, nunca conteúdo privado antigo", async () => {
  const worker = await workerHarness({ networkFails: true });
  assert.equal(await (await worker.request("/minha-conta", "navigate")).text(), "Sem conexão");
});
test("ativação elimina versões antigas somente deste app", async () => {
  const worker = await workerHarness({ keys: ["jbs-app-v2", "jbs-app-v4", "outro-app"] });
  let done;
  worker.handlers.get("activate")({ waitUntil: promise => { done = promise; } });
  await done;
  assert.deepEqual(worker.deleted, ["jbs-app-v2"]);
});
test("PWA verifica atualizações ao retomar sem descartar um formulário aberto", async () => {
  const updater = await readFile(new URL("../app/pwa-update-manager.tsx", import.meta.url), "utf8");
  assert.match(updater, /updateViaCache:\s*"none"/);
  assert.match(updater, /registration\.update\(\)/);
  assert.match(updater, /visibilitychange/);
  assert.match(updater, /setAvailable\(true\)/);
  assert.match(updater, /onClick=\{\(\) => window\.location\.reload\(\)\}/);
});
