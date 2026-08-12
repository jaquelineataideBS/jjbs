import { eq } from "drizzle-orm";
import { getDb } from "../../../../db";
import { mediaAssets } from "../../../../db/schema";

export async function GET(_request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await context.params;
    if (!/^[0-9a-f-]{36}$/i.test(id)) return new Response("Imagem não encontrada.", { status: 404 });
    const db = await getDb();
    const [storedImage] = await db.select({ mimeType: mediaAssets.mimeType, dataBase64: mediaAssets.dataBase64 }).from(mediaAssets).where(eq(mediaAssets.id, id)).limit(1);
    if (!storedImage) return new Response("Imagem não encontrada.", { status: 404 });
    return new Response(Buffer.from(storedImage.dataBase64, "base64"), {
      headers: { "Content-Type": storedImage.mimeType, "Cache-Control": "public, max-age=31536000, immutable", "X-Content-Type-Options": "nosniff" },
    });
  } catch {
    return new Response("Não foi possível carregar a imagem.", { status: 500 });
  }
}
