import { eq } from "drizzle-orm";
import { getDb } from "../../../../db";
import { mediaAssets } from "../../../../db/schema";

export async function GET(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await context.params;
    if (!/^[0-9a-f-]{36}$/i.test(id)) return new Response("Imagem não encontrada.", { status: 404 });
    const db = await getDb();
    const [storedMedia] = await db.select({ mimeType: mediaAssets.mimeType, dataBase64: mediaAssets.dataBase64 }).from(mediaAssets).where(eq(mediaAssets.id, id)).limit(1);
    if (!storedMedia) return new Response("Mídia não encontrada.", { status: 404 });
    const bytes = Buffer.from(storedMedia.dataBase64, "base64");
    const range = request.headers.get("range");
    const headers = {
      "Accept-Ranges": "bytes",
      "Cache-Control": "public, max-age=31536000, immutable",
      "Content-Type": storedMedia.mimeType,
      "X-Content-Type-Options": "nosniff",
    };
    if (range && storedMedia.mimeType.startsWith("video/")) {
      const match = /^bytes=(\d*)-(\d*)$/.exec(range);
      if (!match || (!match[1] && !match[2])) {
        return new Response(null, { status: 416, headers: { ...headers, "Content-Range": `bytes */${bytes.length}` } });
      }
      const start = match[1] ? Number(match[1]) : Math.max(0, bytes.length - Number(match[2]));
      const end = match[2] && match[1] ? Math.min(Number(match[2]), bytes.length - 1) : bytes.length - 1;
      if (!Number.isSafeInteger(start) || !Number.isSafeInteger(end) || start < 0 || start > end || start >= bytes.length) {
        return new Response(null, { status: 416, headers: { ...headers, "Content-Range": `bytes */${bytes.length}` } });
      }
      const chunk = bytes.subarray(start, end + 1);
      return new Response(chunk, {
        status: 206,
        headers: {
          ...headers,
          "Content-Length": String(chunk.length),
          "Content-Range": `bytes ${start}-${end}/${bytes.length}`,
        },
      });
    }
    return new Response(bytes, {
      headers: { ...headers, "Content-Length": String(bytes.length) },
    });
  } catch {
    return new Response("Não foi possível carregar a mídia.", { status: 500 });
  }
}
