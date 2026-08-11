import test from "node:test";
import assert from "node:assert/strict";
import { formatWhatsapp, normalizeWhatsapp } from "../lib/masks.ts";

test("formata WhatsApp celular e fixo no padrão brasileiro", () => {
  assert.equal(formatWhatsapp("85999990000"), "(85) 99999-0000");
  assert.equal(formatWhatsapp("8533334444"), "(85) 3333-4444");
});

test("remove o código 55 antes de aplicar a máscara", () => {
  assert.equal(formatWhatsapp("5585999990000"), "(85) 99999-0000");
});

test("normaliza somente números completos", () => {
  assert.equal(normalizeWhatsapp("(85) 99999-0000"), "(85) 99999-0000");
  assert.equal(normalizeWhatsapp("85999"), null);
});
