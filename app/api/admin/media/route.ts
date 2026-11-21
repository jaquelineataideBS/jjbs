import { getDb } from "../../../../db";
import { auditLogs, mediaAssets } from "../../../../db/schema";
import { requirePermission } from "../../../../lib/admin";
import { validImageFile, validVideoFile } from "../../../../lib/image-files";

const MAX_MEDIA_BYTES = 4 * 1024 * 1024;

export async function POST(request: Request) {
  try {
    const admin = await requirePermission(request, "portfolio") ?? await requirePermission(request, "settings");
    if (!admin) return Response.json({ message: "Acesso restrito ao envio de mídias." }, { status: 403 });
    const formData = await request.formData();
    const file = formData.get("file");
    if (!(file instanceof File)) return Response.json({ message: "Selecione uma foto ou vídeo para a galeria." }, { status: 400 });
    if (file.size <= 0 || file.size > MAX_MEDIA_BYTES) return Response.json({ message: "A foto ou o vídeo deve ter no máximo 4 MB." }, { status: 400 });
    const bytes = new Uint8Array(await file.arrayBuffer());
    const isImage = validImageFile(bytes, file.type);
    const isVideo = validVideoFile(bytes, file.type);
    if (!isImage && !isVideo) return Response.json({ message: "Envie uma foto JPEG ou PNG, ou um vídeo MP4, MOV ou WebM válido." }, { status: 400 });

    const id = crypto.randomUUID();
    const db = await getDb();
    await db.batch([
      db.insert(mediaAssets).values({ id, fileName: file.name.slice(0, 180) || (isVideo ? "video" : "imagem"), mimeType: file.type, dataBase64: Buffer.from(bytes).toString("base64"), sizeBytes: file.size, createdBy: admin.id }),
      db.insert(auditLogs).values({ id: crypto.randomUUID(), userId: admin.id, action: "media.uploaded", entity: "media_asset", entityId: id, metadata: { mimeType: file.type, mediaKind: isVideo ? "video" : "image", sizeBytes: file.size } }),
    ]);
    const mediaUrl = `/api/media/${id}`;
    return Response.json({ mediaUrl, ...(isImage ? { imageUrl: mediaUrl } : {}), message: isVideo ? "Vídeo enviado." : "Imagem enviada." }, { status: 201, headers: { "Cache-Control": "no-store" } });
  } catch {
    return Response.json({ message: "Não foi possível enviar a mídia." }, { status: 500 });
  }
}
