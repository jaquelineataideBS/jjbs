import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const root = new URL("../", import.meta.url);
const publicPages = [
  "app/agendar/page.tsx", "app/contato/page.tsx", "app/servicos/page.tsx",
  "app/trabalhos/page.tsx", "app/promocoes/page.tsx", "app/lista-de-espera/page.tsx",
  "app/minha-conta/page.tsx", "app/esqueci-senha/page.tsx", "app/redefinir-senha/page.tsx",
];

test("páginas públicas usam a identidade compartilhada do studio", async () => {
  for (const path of publicPages) {
    const source = await readFile(new URL(path, root), "utf8");
    assert.match(source, /PublicBrand/, `${path} não usa PublicBrand`);
    assert.doesNotMatch(source, /wa\.me\/5500000000000/, `${path} ainda possui WhatsApp fixo`);
  }
});

test("configurações públicas cobrem identidade, contato, políticas e PWA", async () => {
  const settings = await readFile(new URL("lib/public-settings.ts", root), "utf8");
  const layout = await readFile(new URL("app/layout.tsx", root), "utf8");
  const manifest = await readFile(new URL("app/manifest.ts", root), "utf8");
  for (const field of ["salonName", "logoUrl", "address", "whatsapp", "instagram", "cancellationPolicy", "privacyPolicy", "primaryColor", "accentColor"]) assert.match(settings, new RegExp(field));
  assert.match(layout, /generateMetadata/);
  assert.match(manifest, /getPublicSettings/);
});

test("reagendamento respeita a opção configurada no servidor", async () => {
  const account = await readFile(new URL("app/api/account/appointments/route.ts", root), "utf8");
  const booking = await readFile(new URL("app/api/appointments/route.ts", root), "utf8");
  assert.match(account, /canReschedule: settings\?\.rescheduleAllowed !== false/);
  assert.match(booking, /!settings\.rescheduleAllowed/);
});
