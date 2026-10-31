import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const root = new URL("../", import.meta.url);

test("agendamento possui etapa de cupom validado no servidor", async () => {
  const page = await readFile(new URL("app/agendar/page.tsx", root), "utf8");
  const route = await readFile(new URL("app/api/promotions/validate/route.ts", root), "utf8");
  assert.match(page, /"Promoção",[\s\S]*"Revisão"/);
  assert.match(page, /\/api\/promotions\/validate/);
  assert.match(route, /validateCoupon/);
});

test("cupom e desconto ficam vinculados ao agendamento", async () => {
  const route = await readFile(new URL("app/api/appointments/route.ts", root), "utf8");
  const schema = await readFile(new URL("db/schema.ts", root), "utf8");
  assert.match(route, /promotionId: appliedPromotion\?\.id/);
  assert.match(route, /discountCents: appliedPromotion\?\.discountCents/);
  assert.match(schema, /couponCode: text\("coupon_code"\)/);
});

test("agendamento autenticado cria aviso na conta junto com a reserva", async () => {
  const route = await readFile(new URL("app/api/appointments/route.ts", root), "utf8");
  assert.match(route, /import \{[^}]*notifications[^}]*\} from "\.\.\/\.\.\/\.\.\/db\/schema"/);
  assert.match(route, /title: rescheduledAppointment \? "Agendamento atualizado" : "Solicitação recebida"/);
  assert.match(route, /channel: "in_app"/);
  assert.match(route, /userId: currentUser\.id/);
  assert.match(route, /\.\.\.\(appointmentNotification \? \[appointmentNotification\] : \[\]\)/);
});

test("página inicial lê configurações e conteúdo público do banco", async () => {
  const page = await readFile(new URL("app/page.tsx", root), "utf8");
  assert.match(page, /getPublicSettings/);
  assert.match(page, /settings\.homepageHeadline/);
  assert.match(page, /settings\.bannerImageUrl/);
  assert.match(page, /settings\.whatsapp/);
});
