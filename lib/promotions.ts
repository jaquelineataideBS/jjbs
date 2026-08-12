import { and, eq, gte, lte } from "drizzle-orm";
import { getDb } from "../db";
import { promotionServices, promotions } from "../db/schema";
import { todayInFortaleza } from "./scheduling";

type Database = Awaited<ReturnType<typeof getDb>>;

export function normalizeCoupon(value: unknown) {
  return typeof value === "string" ? value.trim().toUpperCase().replace(/\s+/g, "") : "";
}

export async function validateCoupon(db: Database, couponInput: unknown, serviceId: string, priceCents: number | null) {
  const couponCode = normalizeCoupon(couponInput);
  if (!couponCode || couponCode.length > 40) return null;

  const today = todayInFortaleza();
  const [promotion] = await db.select().from(promotions).where(and(
    eq(promotions.couponCode, couponCode),
    eq(promotions.active, true),
    lte(promotions.startDate, today),
    gte(promotions.endDate, today),
  )).limit(1);
  if (!promotion) return null;

  const links = await db.select({ serviceId: promotionServices.serviceId })
    .from(promotionServices)
    .where(eq(promotionServices.promotionId, promotion.id));
  if (links.length && !links.some((link) => link.serviceId === serviceId)) return null;

  const basePrice = Math.max(0, priceCents ?? 0);
  const discountCents = promotion.discountType === "percentage"
    ? Math.min(basePrice, Math.round(basePrice * promotion.discountValue / 100))
    : promotion.discountType === "fixed"
      ? Math.min(basePrice, promotion.discountValue)
      : 0;

  return {
    id: promotion.id,
    title: promotion.title,
    couponCode,
    discountType: promotion.discountType,
    discountValue: promotion.discountValue,
    discountCents,
    comboDescription: promotion.comboDescription,
  };
}
