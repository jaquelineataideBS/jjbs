import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const root = new URL("../", import.meta.url);
const read = (path) => readFile(new URL(path, root), "utf8");

test("FCM entrega avisos de agendamento apenas aos usuários internos", async () => {
  const route = await read("app/api/appointments/route.ts");
  const sender = await read("lib/firebase-push.ts");
  assert.match(route, /inArray\(users\.role, \[\.\.\.internalRoles\]\)/);
  assert.match(route, /sendAppointmentPush\(studioUsers\.map/);
  assert.match(route, /db\.insert\(notifications\)\.values\(studioNotificationValues\)/);
  assert.match(sender, /FIREBASE_SERVICE_ACCOUNT_JSON/);
  assert.match(sender, /messaging\.sendEach\(messages\)/);
});

test("promoções respeitam consentimento e só avisam contas ativas de clientes", async () => {
  const marketing = await read("app/api/admin/marketing/route.ts");
  const sender = await read("lib/firebase-push.ts");
  assert.match(marketing, /announcePromotion\(promotion, admin\.id\)/);
  assert.match(sender, /eq\(clients\.marketingConsent, true\)/);
  assert.match(sender, /eq\(users\.role, "client"\)/);
  assert.match(sender, /eq\(users\.status, "active"\)/);
});

test("Firebase mantém o worker de push em escopo separado do PWA", async () => {
  const client = await read("lib/firebase-web.ts");
  const worker = await read("public/fcm/firebase-messaging-sw.js");
  const component = await read("app/push-notifications-control.tsx");
  assert.match(client, /"\/fcm\/firebase-messaging-sw\.js"/);
  assert.match(client, /scope: "\/fcm\/"/);
  assert.match(worker, /onBackgroundMessage/);
  assert.match(worker, /notificationclick/);
  assert.match(component, /Aceito receber cupons e promoções/);
});

test("credencial administrativa do Firebase nunca é incluída no cliente", async () => {
  const webClient = await read("lib/firebase-web.ts");
  const adminSender = await read("lib/firebase-push.ts");
  assert.doesNotMatch(webClient, /FIREBASE_SERVICE_ACCOUNT_JSON|private_key/);
  assert.match(adminSender, /FIREBASE_SERVICE_ACCOUNT_JSON/);
});
