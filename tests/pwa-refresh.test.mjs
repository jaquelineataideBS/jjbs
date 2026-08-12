import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

test("PWA verifica atualizações sem reutilizar o cache do service worker", async () => {
  const invitation = await readFile(new URL("../app/pwa-install-invitation.tsx", import.meta.url), "utf8");
  const worker = await readFile(new URL("../public/sw.js", import.meta.url), "utf8");
  const nextConfig = await readFile(new URL("../next.config.ts", import.meta.url), "utf8");

  assert.match(invitation, /updateViaCache:\s*"none"/);
  assert.match(invitation, /registration\.update\(\)/);
  assert.match(invitation, /controllerchange/);
  assert.match(worker, /fetch\(request,\s*\{\s*cache:\s*"no-store"\s*\}\)/);
  assert.match(worker, /jbs-app-v2/);
  assert.match(nextConfig, /no-cache, no-store, must-revalidate/);
});
