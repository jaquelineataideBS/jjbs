import assert from "node:assert/strict";
import { access, readFile } from "node:fs/promises";
import test from "node:test";

const baseUrl = process.env.TEST_BASE_URL;

test("production server renders the current homepage", { skip: !baseUrl && "Set TEST_BASE_URL to the running production build." }, async () => {
  const response = await fetch(new URL("/", baseUrl), { headers: { accept: "text/html" } });
  assert.equal(response.status, 200);
  assert.match(response.headers.get("content-type") ?? "", /^text\/html\b/i);
  const html = await response.text();
  assert.match(html, /class="studio-home"/);
  assert.match(html, /id="home-title"/);
  assert.match(html, /Agendar meu horário/);
  assert.match(html, /\/minha-conta/);
  assert.doesNotMatch(html, /Your site is taking shape|codex-preview|SkeletonPreview/i);
});

test("the disposable starter preview is no longer part of the project", async () => {
  const [page, layout, css] = await Promise.all([
    readFile(new URL("../app/page.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/layout.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/globals.css", import.meta.url), "utf8"),
  ]);
  assert.match(page, /export default async function Home/);
  assert.match(layout, /getPublicSettings/);
  assert.match(css, /--gold/);
  assert.doesNotMatch(page, /_sites-preview|SkeletonPreview|codex-preview/);
  await assert.rejects(access(new URL("../app/_sites-preview", import.meta.url)));
});
