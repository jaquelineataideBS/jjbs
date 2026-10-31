import test from "node:test";
import assert from "node:assert/strict";
import { prepareImage } from "../lib/prepare-image.ts";

test("foto inválida ou acima de 25 MB é rejeitada antes de decodificar", async () => {
  await assert.rejects(prepareImage(new File([], "vazio.jpg", { type: "image/jpeg" })), /25 MB/);
  await assert.rejects(prepareImage(new File([new Uint8Array(26 * 1024 * 1024)], "camera.jpg", { type: "image/jpeg" })), /25 MB/);
  await assert.rejects(prepareImage(new File(["<svg/>"], "imagem.svg", { type: "image/svg+xml" })), /JPEG, PNG ou WebP/);
});
