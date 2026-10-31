export const imageUploadAccept = "image/jpeg,image/png,image/webp,image/heic,image/heif,.jpg,.jpeg,.png,.webp,.heic,.heif";
const MAX_SOURCE_BYTES = 25 * 1024 * 1024;
const MAX_UPLOAD_BYTES = 3 * 1024 * 1024;

/** Resize on the device so camera photos fit the API and hosting request limit. */
export async function prepareImage(file: File): Promise<File> {
  if (!file.size || file.size > MAX_SOURCE_BYTES) throw new Error("Escolha uma foto de até 25 MB.");
  if (!/^image\/(jpeg|png|webp|heic|heif)$/i.test(file.type) && !/\.(jpe?g|png|webp|heic|heif)$/i.test(file.name)) {
    throw new Error("Escolha uma foto JPEG, PNG ou WebP.");
  }
  const source = URL.createObjectURL(file);
  try {
    const image = await new Promise<HTMLImageElement>((resolve, reject) => {
      const decoded = new Image();
      const timer = window.setTimeout(() => reject(new Error("A foto demorou para abrir. Tente uma imagem menor.")), 20000);
      decoded.onload = () => { window.clearTimeout(timer); resolve(decoded); };
      decoded.onerror = () => {
        window.clearTimeout(timer);
        reject(new Error(/hei[cf]/i.test(file.type + file.name)
          ? "Este navegador não conseguiu abrir a foto HEIC. Exporte como JPEG ou use a opção de câmera em formato mais compatível."
          : "Não foi possível abrir esta foto. Escolha outro arquivo JPEG, PNG ou WebP."));
      };
      decoded.src = source;
    });
    if (!image.naturalWidth || !image.naturalHeight) throw new Error("A foto não tem dimensões válidas.");
    const canvas = document.createElement("canvas");
    const context = canvas.getContext("2d");
    if (!context) throw new Error("Não foi possível preparar a foto neste navegador.");
    const mime = file.type === "image/png" || /\.png$/i.test(file.name) ? "image/png" : "image/jpeg";
    let edge = 2000;
    for (let attempt = 0; attempt < 5; attempt += 1) {
      const ratio = Math.min(1, edge / Math.max(image.naturalWidth, image.naturalHeight));
      canvas.width = Math.max(1, Math.round(image.naturalWidth * ratio));
      canvas.height = Math.max(1, Math.round(image.naturalHeight * ratio));
      context.drawImage(image, 0, 0, canvas.width, canvas.height);
      const blob = await new Promise<Blob | null>(resolve => canvas.toBlob(resolve, mime, 0.86 - attempt * 0.06));
      if (blob && blob.size <= MAX_UPLOAD_BYTES) {
        const extension = mime === "image/png" ? ".png" : ".jpg";
        return new File([blob], file.name.replace(/\.[^.]+$/, "").slice(0, 150) + extension, { type: mime });
      }
      edge = Math.round(edge * 0.75);
    }
    throw new Error("Não foi possível reduzir a foto. Escolha uma imagem menor.");
  } finally {
    URL.revokeObjectURL(source);
  }
}
