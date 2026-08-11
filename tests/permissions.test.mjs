import assert from "node:assert/strict";
import test from "node:test";
import { permissionsForRole } from "../lib/permissions.ts";

test("administrador possui todas as permissões internas", () => {
  assert.equal(permissionsForRole("admin").includes("users"), true);
  assert.equal(permissionsForRole("admin").includes("finance"), true);
});

test("gestão opera o studio sem administrar usuários", () => {
  assert.equal(permissionsForRole("manager").includes("finance"), true);
  assert.equal(permissionsForRole("manager").includes("settings"), true);
  assert.equal(permissionsForRole("manager").includes("users"), false);
});

test("funcionário acessa somente painel, agenda e clientes", () => {
  assert.deepEqual(permissionsForRole("staff"), ["dashboard", "appointments", "clients"]);
});

test("cliente não recebe permissões internas", () => {
  assert.deepEqual(permissionsForRole("client"), []);
});
