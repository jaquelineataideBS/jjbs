import test from "node:test";
import assert from "node:assert/strict";
import { normalizeCategoryName } from "../lib/categories.ts";

test("normaliza o nome da categoria", () => {
  assert.equal(normalizeCategoryName("  Tratamentos   capilares  "), "Tratamentos capilares");
});

test("rejeita categorias vazias ou muito longas", () => {
  assert.equal(normalizeCategoryName(" "), null);
  assert.equal(normalizeCategoryName("a"), null);
  assert.equal(normalizeCategoryName("x".repeat(81)), null);
});
