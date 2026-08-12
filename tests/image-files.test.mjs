import test from "node:test";
import assert from "node:assert/strict";
import { validImageFile, validStoredImagePath } from "../lib/image-files.ts";

test("aceita somente assinaturas reais de JPEG e PNG", () => {
  assert.equal(validImageFile(Uint8Array.from([0xff, 0xd8, 0xff, 0x00]), "image/jpeg"), true);
  assert.equal(validImageFile(Uint8Array.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]), "image/png"), true);
  assert.equal(validImageFile(Uint8Array.from([0x00, 0x01]), "image/jpeg"), false);
  assert.equal(validImageFile(Uint8Array.from([0xff, 0xd8, 0xff]), "image/gif"), false);
});

test("aceita mídia interna e mantém links antigos HTTPS", () => {
  assert.equal(validStoredImagePath("/api/media/123e4567-e89b-12d3-a456-426614174000", true), "/api/media/123e4567-e89b-12d3-a456-426614174000");
  assert.equal(validStoredImagePath("https://example.com/foto.jpg", true), "https://example.com/foto.jpg");
  assert.equal(validStoredImagePath("http://example.com/foto.jpg", true), undefined);
});
