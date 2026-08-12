import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

test("exclusão de cliente preserva histórico e revoga a conta vinculada", async () => {
  const route = await readFile(new URL("../app/api/admin/clients/route.ts", import.meta.url), "utf8");
  assert.match(route, /active:\s*false/);
  assert.match(route, /status:\s*"inactive"/);
  assert.match(route, /db\.delete\(sessions\)/);
  assert.match(route, /agendamentos futuros antes de excluir/);
  assert.doesNotMatch(route, /db\.delete\(clients\)/);
});
