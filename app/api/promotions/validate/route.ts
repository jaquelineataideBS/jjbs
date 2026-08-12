import { and, eq } from "drizzle-orm";
import { getDb } from "../../../../db";
import { services } from "../../../../db/schema";
import { normalizeCoupon, validateCoupon } from "../../../../lib/promotions";

export async function POST(request: Request) {
  try {
    const body: unknown = await request.json();
    if (!body || typeof body !== "object") return Response.json({ message: "Informe o cupom e o serviço." }, { status: 400 });
    const input = body as Record<string, unknown>;
    const serviceId = typeof input.serviceId === "string" ? input.serviceId.trim() : "";
    const couponCode = normalizeCoupon(input.couponCode);
    if (!serviceId || !couponCode) return Response.json({ message: "Digite um cupom válido." }, { status: 400 });

    const db = await getDb();
    const [service] = await db.select({ id: services.id, priceCents: services.priceCents })
      .from(services).where(and(eq(services.id, serviceId), eq(services.active, true))).limit(1);
    if (!service) return Response.json({ message: "Serviço indisponível." }, { status: 404 });
    const promotion = await validateCoupon(db, couponCode, service.id, service.priceCents);
    if (!promotion) return Response.json({ message: "Cupom inválido, vencido ou não disponível para este serviço." }, { status: 404 });
    return Response.json({ promotion, message: "Cupom aplicado com sucesso." }, { headers: { "Cache-Control": "no-store" } });
  } catch {
    return Response.json({ message: "Não foi possível validar o cupom agora." }, { status: 500, headers: { "Cache-Control": "no-store" } });
  }
}
