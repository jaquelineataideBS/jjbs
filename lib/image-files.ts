const allowedImageTypes = new Set(["image/jpeg", "image/png"]);

export function validImageFile(bytes: Uint8Array, mimeType: string) {
  if (!allowedImageTypes.has(mimeType)) return false;
  if (mimeType === "image/jpeg") return bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff;
  return bytes.length >= 8 && bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47 && bytes[4] === 0x0d && bytes[5] === 0x0a && bytes[6] === 0x1a && bytes[7] === 0x0a;
}

export function validStoredImagePath(value: unknown, required = false) {
  if (typeof value !== "string" || !value.trim()) return required ? undefined : null;
  const source = value.trim();
  if (/^\/api\/media\/[0-9a-f-]{36}$/i.test(source)) return source;
  try {
    const url = new URL(source);
    return url.protocol === "https:" && !url.username && !url.password && url.toString().length <= 2000 ? url.toString() : undefined;
  } catch {
    return undefined;
  }
}
