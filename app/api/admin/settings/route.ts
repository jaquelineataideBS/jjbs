import { eq } from "drizzle-orm";
import { getDb } from "../../../../db";
import { auditLogs, salonSettings } from "../../../../db/schema";
import { requireAdmin } from "../../../../lib/admin";
import { normalizeWhatsapp } from "../../../../lib/masks";
import { validStoredImagePath } from "../../../../lib/image-files";

function noStore(data: Record<string, unknown>, status = 200) {
  return Response.json(data, { status, headers: { "Cache-Control": "no-store" } });
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function text(value: unknown, max: number, required = false) {
  if (typeof value !== "string") return required ? undefined : null;
  const trimmed = value.trim();
  return trimmed && trimmed.length <= max ? trimmed : required ? undefined : null;
}

export async function GET(request: Request) {
  try {
    if (!await requireAdmin(request)) return noStore({ message: "Acesso restrito ao painel administrativo." }, 403);
    const db = await getDb();
    const [settings] = await db.select().from(salonSettings).where(eq(salonSettings.id, "studio")).limit(1);
    return noStore({ settings });
  } catch {
    return noStore({ message: "Não foi possível carregar as configurações." }, 500);
  }
}

export async function PATCH(request: Request) {
  try {
    const admin = await requireAdmin(request);
    if (!admin) return noStore({ message: "Acesso restrito ao painel administrativo." }, 403);
    const body: unknown = await request.json();
    if (!isRecord(body)) return noStore({ message: "Dados inválidos." }, 400);

    const salonName = text(body.salonName, 120, true);
    const cancellationPolicy = text(body.cancellationPolicy, 3000, true);
    const privacyPolicy = text(body.privacyPolicy, 5000, true);
    const whatsappInput = typeof body.whatsapp === "string" ? body.whatsapp.trim() : "";
    const whatsapp = whatsappInput ? normalizeWhatsapp(whatsappInput) : null;
    const cancellationHours = Number(body.cancellationHours);
    const depositPercent = Number(body.depositPercent);
    const toleranceMinutes = Number(body.toleranceMinutes);
    const noShowBlockThreshold = Number(body.noShowBlockThreshold);
    const noShowBlockDays = Number(body.noShowBlockDays);
    const logoUrl = text(body.logoUrl, 500);
    const bannerImageUrl = text(body.bannerImageUrl, 500);

    if (
      !salonName ||
      !cancellationPolicy ||
      !privacyPolicy ||
      (whatsappInput && !whatsapp) ||
      ![cancellationHours, depositPercent, toleranceMinutes, noShowBlockThreshold, noShowBlockDays].every(Number.isSafeInteger) ||
      cancellationHours < 0 || cancellationHours > 720 ||
      depositPercent < 0 || depositPercent > 100 ||
      toleranceMinutes < 0 || toleranceMinutes > 180
      || (logoUrl && !validStoredImagePath(logoUrl))
      || (bannerImageUrl && !validStoredImagePath(bannerImageUrl))
    ) {
      return noStore({ message: "Revise o WhatsApp, as regras e os prazos do studio." }, 400);
    }

    const values = {
      salonName,
      logoUrl,
      address: text(body.address, 500),
      whatsapp,
      instagram: text(body.instagram, 200),
      cancellationHours,
      depositPercent,
      toleranceMinutes,
      rescheduleAllowed: body.rescheduleAllowed !== false,
      noShowBlockThreshold,
      noShowBlockDays,
      cancellationPolicy,
      privacyPolicy,
      homepageHeadline: text(body.homepageHeadline, 240),
      homepageDescription: text(body.homepageDescription, 1000),
      bannerImageUrl,
      primaryColor: typeof body.primaryColor === "string" && /^#[0-9a-f]{6}$/i.test(body.primaryColor) ? body.primaryColor : "#0B0B0B",
      accentColor: typeof body.accentColor === "string" && /^#[0-9a-f]{6}$/i.test(body.accentColor) ? body.accentColor : "#D4AF37",
      updatedBy: admin.id,
      updatedAt: new Date(),
    };
    const db = await getDb();
    const [settings] = await db.insert(salonSettings).values({ id: "studio", ...values }).onConflictDoUpdate({ target: salonSettings.id, set: values }).returning();
    await db.insert(auditLogs).values({
      id: crypto.randomUUID(),
      userId: admin.id,
      action: "salon_settings.updated",
      entity: "salon_settings",
      entityId: "studio",
      metadata: { cancellationHours, depositPercent, toleranceMinutes },
    });
    return noStore({ settings, message: "Configurações atualizadas." });
  } catch {
    return noStore({ message: "Não foi possível atualizar as configurações." }, 500);
  }
}
