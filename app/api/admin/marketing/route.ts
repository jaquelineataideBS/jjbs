import { asc, desc, eq, sql } from "drizzle-orm";
import { getDb } from "../../../../db";
import {
  auditLogs,
  clients,
  loyaltyAccounts,
  loyaltyTransactions,
  promotionServices,
  promotions,
  services,
} from "../../../../db/schema";
import { requireAdmin } from "../../../../lib/admin";

const discountTypes = new Set(["percentage", "fixed", "combo"]);
const audiences = new Set(["all", "birthday", "first_visit", "off_peak"]);
const loyaltyKinds = new Set(["service", "referral", "birthday", "redemption", "adjustment"]);

function noStore(data: Record<string, unknown>, status = 200) {
  return Response.json(data, { status, headers: { "Cache-Control": "no-store" } });
}
function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}
function optionalText(value: unknown, max: number) {
  if (value == null || value === "") return null;
  if (typeof value !== "string") return undefined;
  const text = value.trim();
  return text.length <= max ? text || null : undefined;
}
function parsePromotion(value: unknown) {
  if (!isRecord(value)) return null;
  const id = typeof value.id === "string" ? value.id.trim() : undefined;
  const title = typeof value.title === "string" ? value.title.trim() : "";
  const description = typeof value.description === "string" ? value.description.trim() : "";
  const discountType = typeof value.discountType === "string" ? value.discountType : "";
  const audience = typeof value.audience === "string" ? value.audience : "";
  const discountValue = typeof value.discountValue === "number" && Number.isSafeInteger(value.discountValue) ? value.discountValue : -1;
  const couponCodeValue = optionalText(value.couponCode, 40);
  const comboDescription = optionalText(value.comboDescription, 500);
  const startDate = typeof value.startDate === "string" ? value.startDate : "";
  const endDate = typeof value.endDate === "string" ? value.endDate : "";
  const serviceIds = Array.isArray(value.serviceIds) && value.serviceIds.every((item) => typeof item === "string") ? [...new Set(value.serviceIds)] : [];
  if (title.length < 3 || title.length > 120 || description.length < 5 || description.length > 1000 || !discountTypes.has(discountType) || !audiences.has(audience) || discountValue < 0 || discountValue > 10_000_000 || couponCodeValue === undefined || comboDescription === undefined || !/^\d{4}-\d{2}-\d{2}$/.test(startDate) || !/^\d{4}-\d{2}-\d{2}$/.test(endDate) || endDate < startDate) return null;
  if (discountType === "percentage" && discountValue > 100) return null;
  return { id, title, description, discountType, discountValue, couponCode: couponCodeValue?.toUpperCase() ?? null, audience, comboDescription, startDate, endDate, active: value.active !== false, featured: value.featured === true, serviceIds };
}

export async function GET(request: Request) {
  try {
    if (!(await requireAdmin(request))) return noStore({ message: "Acesso restrito ao painel administrativo." }, 403);
    const db = await getDb();
    const [promotionRows, links, serviceRows, clientRows, accountRows] = await Promise.all([
      db.select().from(promotions).orderBy(desc(promotions.startDate)).limit(300),
      db.select().from(promotionServices),
      db.select({ id: services.id, name: services.name, active: services.active }).from(services).orderBy(asc(services.name)),
      db.select({ id: clients.id, name: clients.name, phone: clients.phone }).from(clients).where(eq(clients.active, true)).orderBy(asc(clients.name)).limit(500),
      db.select().from(loyaltyAccounts),
    ]);
    const accounts = new Map(accountRows.map((item) => [item.clientId, item]));
    return noStore({
      promotions: promotionRows.map((item) => ({ ...item, serviceIds: links.filter((link) => link.promotionId === item.id).map((link) => link.serviceId) })),
      services: serviceRows,
      clients: clientRows.map((item) => ({ ...item, loyalty: accounts.get(item.id) ?? { points: 0, stamps: 0, referrals: 0 } })),
    });
  } catch {
    return noStore({ message: "Não foi possível carregar promoções e fidelidade." }, 500);
  }
}

export async function POST(request: Request) {
  try {
    const admin = await requireAdmin(request);
    if (!admin) return noStore({ message: "Acesso restrito ao painel administrativo." }, 403);
    const body: unknown = await request.json();
    if (!isRecord(body)) return noStore({ message: "Dados inválidos." }, 400);
    const db = await getDb();
    if (body.resource === "loyalty") {
      const clientId = typeof body.clientId === "string" ? body.clientId : "";
      const kind = typeof body.kind === "string" ? body.kind : "";
      const description = typeof body.description === "string" ? body.description.trim() : "";
      const pointsDelta = typeof body.pointsDelta === "number" && Number.isSafeInteger(body.pointsDelta) ? body.pointsDelta : 0;
      const stampsDelta = typeof body.stampsDelta === "number" && Number.isSafeInteger(body.stampsDelta) ? body.stampsDelta : 0;
      const referralsDelta = typeof body.referralsDelta === "number" && Number.isSafeInteger(body.referralsDelta) ? body.referralsDelta : 0;
      if (!clientId || !loyaltyKinds.has(kind) || description.length < 3 || description.length > 300 || [pointsDelta, stampsDelta, referralsDelta].some((item) => Math.abs(item) > 10000) || (!pointsDelta && !stampsDelta && !referralsDelta)) return noStore({ message: "Revise a cliente e a movimentação de fidelidade." }, 400);
      const [client] = await db.select({ id: clients.id }).from(clients).where(eq(clients.id, clientId)).limit(1);
      if (!client) return noStore({ message: "Cliente não encontrada." }, 404);
      const accountId = crypto.randomUUID();
      const [account] = await db.insert(loyaltyAccounts).values({ id: accountId, clientId, points: Math.max(0, pointsDelta), stamps: Math.max(0, stampsDelta), referrals: Math.max(0, referralsDelta) }).onConflictDoUpdate({
        target: loyaltyAccounts.clientId,
        set: {
          points: sql`greatest(0, ${loyaltyAccounts.points} + ${pointsDelta})`,
          stamps: sql`greatest(0, ${loyaltyAccounts.stamps} + ${stampsDelta})`,
          referrals: sql`greatest(0, ${loyaltyAccounts.referrals} + ${referralsDelta})`,
          updatedAt: new Date(),
        },
      }).returning();
      const transactionId = crypto.randomUUID();
      await db.batch([
        db.insert(loyaltyTransactions).values({ id: transactionId, clientId, kind, pointsDelta, stampsDelta, referralsDelta, description, createdBy: admin.id }),
        db.insert(auditLogs).values({ id: crypto.randomUUID(), userId: admin.id, action: "loyalty.adjusted", entity: "client", entityId: clientId, metadata: { kind, pointsDelta, stampsDelta, referralsDelta } }),
      ]);
      return noStore({ account, message: "Fidelidade atualizada com histórico." }, 201);
    }

    const input = parsePromotion(body);
    if (!input) return noStore({ message: "Revise título, desconto, período e público da promoção." }, 400);
    const id = crypto.randomUUID();
    const { serviceIds, id: ignoredId, ...values } = input;
    void ignoredId;
    const [promotion] = await db.insert(promotions).values({ id, createdBy: admin.id, ...values }).returning();
    if (serviceIds.length) await db.insert(promotionServices).values(serviceIds.map((serviceId) => ({ id: crypto.randomUUID(), promotionId: id, serviceId })));
    await db.insert(auditLogs).values({ id: crypto.randomUUID(), userId: admin.id, action: "promotion.created", entity: "promotion", entityId: id, metadata: { serviceIds } });
    return noStore({ promotion, message: "Promoção criada com sucesso." }, 201);
  } catch (error) {
    const message = error instanceof Error && error.message.includes("promotions_coupon_unique") ? "Este cupom já está em uso." : "Não foi possível salvar agora.";
    return noStore({ message }, 500);
  }
}

export async function PATCH(request: Request) {
  try {
    const admin = await requireAdmin(request);
    if (!admin) return noStore({ message: "Acesso restrito ao painel administrativo." }, 403);
    const input = parsePromotion(await request.json());
    if (!input?.id) return noStore({ message: "Revise os dados da promoção." }, 400);
    const db = await getDb();
    const [current] = await db.select({ id: promotions.id }).from(promotions).where(eq(promotions.id, input.id)).limit(1);
    if (!current) return noStore({ message: "Promoção não encontrada." }, 404);
    const { id, serviceIds, ...values } = input;
    const [promotion] = await db.update(promotions).set({ ...values, updatedAt: new Date() }).where(eq(promotions.id, id)).returning();
    await db.delete(promotionServices).where(eq(promotionServices.promotionId, id));
    if (serviceIds.length) await db.insert(promotionServices).values(serviceIds.map((serviceId) => ({ id: crypto.randomUUID(), promotionId: id, serviceId })));
    await db.insert(auditLogs).values({ id: crypto.randomUUID(), userId: admin.id, action: "promotion.updated", entity: "promotion", entityId: id, metadata: { serviceIds, active: values.active } });
    return noStore({ promotion, message: "Promoção atualizada." });
  } catch {
    return noStore({ message: "Não foi possível atualizar a promoção." }, 500);
  }
}
