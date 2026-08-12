import assert from "node:assert/strict";
import { access, readFile } from "node:fs/promises";
import test from "node:test";

async function render() {
  const workerUrl = new URL("../dist/server/index.js", import.meta.url);
  workerUrl.searchParams.set("test", `${process.pid}-${Date.now()}`);
  const { default: worker } = await import(workerUrl.href);

  return worker.fetch(
    new Request("http://localhost/", { headers: { accept: "text/html" } }),
    { ASSETS: { fetch: async () => new Response("Not found", { status: 404 }) } },
    { waitUntil() {}, passThroughOnException() {} },
  );
}

test("server-renders the Jaqueline Beauty Studio landing page", async () => {
  const response = await render();
  assert.equal(response.status, 200);
  assert.match(response.headers.get("content-type") ?? "", /^text\/html\b/i);

  const html = await response.text();
  assert.match(html, /Jaqueline Beauty Studio/i);
  assert.match(html, /Seu cabelo/i);
  assert.match(html, /Morena iluminada/i);
  assert.match(html, /Agendar meu horário/i);
  assert.match(html, /Falar no WhatsApp/i);
  assert.doesNotMatch(html, /Your site is taking shape|codex-preview|SkeletonPreview/i);
});

test("the disposable starter preview is no longer part of the project", async () => {
  const [page, layout, css] = await Promise.all([
    readFile(new URL("../app/page.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/layout.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/globals.css", import.meta.url), "utf8"),
  ]);

  assert.match(page, /export default function Home/);
  assert.match(layout, /getPublicSettings/);
  assert.match(css, /--gold/);
  assert.doesNotMatch(page, /_sites-preview|SkeletonPreview|codex-preview/);
  await assert.rejects(access(new URL("../app/_sites-preview", import.meta.url)));
});
