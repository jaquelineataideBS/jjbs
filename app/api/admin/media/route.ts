import { getDb } from "../../../../db";
import { auditLogs, mediaAssets } from "../../../../db/schema";
import { requirePermission } from "../../../../lib/admin";
import { validImageFile } from "../../../../lib/image-files";

const MAX_IMAGE_BYTES = 4 * 1024 * 1024;

export async function POST(request: Request) {
  try {
    const admin = await requirePermission(request, "portfolio") ?? await requirePermission(request, "settings");
    if (!admin) return Response.json({ message: "Acesso restrito ao envio de imagens." }, { status: 403 });
    const formData = await request.formData();
    const file = formData.get("file");
    if (!(file instanceof File)) return Response.json({ message: "Selecione uma imagem JPEG ou PNG." }, { status: 400 });
    if (file.size <= 0 || file.size > MAX_IMAGE_BYTES) return Response.json({ message: "A imagem deve ter no máximo 4 MB." }, { status: 400 });
    const bytes = new Uint8Array(await file.arrayBuffer());
    if (!validImageFile(bytes, file.type)) return Response.json({ message: "O arquivo precisa ser uma imagem JPEG ou PNG válida." }, { status: 400 });

    const id = crypto.randomUUID();
    const db = await getDb();
    await db.batch([
      db.insert(mediaAssets).values({ id, fileName: file.name.slice(0, 180) || "imagem", mimeType: file.type, dataBase64: Buffer.from(bytes).toString("base64"), sizeBytes: file.size, createdBy: admin.id }),
      db.insert(auditLogs).values({ id: crypto.randomUUID(), userId: admin.id, action: "media.uploaded", entity: "media_asset", entityId: id, metadata: { mimeType: file.type, sizeBytes: file.size } }),
    ]);
    return Response.json({ imageUrl: `/api/media/${id}`, message: "Imagem enviada." }, { status: 201, headers: { "Cache-Control": "no-store" } });
  } catch {
    return Response.json({ message: "Não foi possível enviar a imagem." }, { status: 500 });
  }
}
