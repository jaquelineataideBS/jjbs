import { asc, eq } from "drizzle-orm";
import { getDb } from "../../../../db";
import {
  auditLogs,
  portfolioItems,
  professionals,
  services,
} from "../../../../db/schema";
import { requireAdmin } from "../../../../lib/admin";
import { validStoredImagePath } from "../../../../lib/image-files";

type PortfolioInput = {
  id?: string;
  title: string;
  description: string;
  category: string;
  serviceId: string | null;
  professionalId: string | null;
  mainImageUrl: string;
  beforeImageUrl: string | null;
  afterImageUrl: string | null;
  published: boolean;
  featured: boolean;
  displayOrder: number;
};

function noStore(data: Record<string, unknown>, status = 200) {
  return Response.json(data, {
    status,
    headers: { "Cache-Control": "no-store" },
  });
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function optionalText(value: unknown, maxLength: number) {
  if (typeof value !== "string") return null;
  const text = value.trim();
  return text && text.length <= maxLength ? text : text ? undefined : null;
}

function parsePortfolio(value: unknown): PortfolioInput | null {
  if (!isRecord(value)) return null;
  const id = typeof value.id === "string" ? value.id.trim() : undefined;
  const title = typeof value.title === "string" ? value.title.trim() : "";
  const description =
    typeof value.description === "string" ? value.description.trim() : "";
  const category =
    typeof value.category === "string" ? value.category.trim() : "";
  const serviceId = optionalText(value.serviceId, 120);
  const professionalId = optionalText(value.professionalId, 120);
  const mainImageUrl = validStoredImagePath(value.mainImageUrl, true);
  const beforeImageUrl = validStoredImagePath(value.beforeImageUrl);
  const afterImageUrl = validStoredImagePath(value.afterImageUrl);
  const displayOrder =
    typeof value.displayOrder === "number"
      ? value.displayOrder
      : Number(value.displayOrder);

  if (
    !title ||
    title.length > 160 ||
    !description ||
    description.length > 1000 ||
    !category ||
    category.length > 80
  )
    return null;
  if (
    [
      serviceId,
      professionalId,
      mainImageUrl,
      beforeImageUrl,
      afterImageUrl,
    ].includes(undefined)
  )
    return null;
  if (
    !mainImageUrl ||
    !Number.isInteger(displayOrder) ||
    displayOrder < 0 ||
    displayOrder > 9999
  )
    return null;
  return {
    id,
    title,
    description,
    category,
    serviceId: serviceId ?? null,
    professionalId: professionalId ?? null,
    mainImageUrl,
    beforeImageUrl: beforeImageUrl ?? null,
    afterImageUrl: afterImageUrl ?? null,
    published: value.published === true,
    featured: value.featured === true,
    displayOrder,
  };
}

function values(input: PortfolioInput) {
  return {
    title: input.title,
    description: input.description,
    category: input.category,
    serviceId: input.serviceId,
    professionalId: input.professionalId,
    mainImageUrl: input.mainImageUrl,
    beforeImageUrl: input.beforeImageUrl,
    afterImageUrl: input.afterImageUrl,
    published: input.published,
    featured: input.featured,
    displayOrder: input.displayOrder,
  };
}

async function validateReferences(input: PortfolioInput) {
  const db = await getDb();
  const [serviceRows, professionalRows] = await Promise.all([
    input.serviceId
      ? db
          .select({ id: services.id })
          .from(services)
          .where(eq(services.id, input.serviceId))
          .limit(1)
      : Promise.resolve([]),
    input.professionalId
      ? db
          .select({ id: professionals.id })
          .from(professionals)
          .where(eq(professionals.id, input.professionalId))
          .limit(1)
      : Promise.resolve([]),
  ]);
  return {
    db,
    valid:
      (!input.serviceId || Boolean(serviceRows[0])) &&
      (!input.professionalId || Boolean(professionalRows[0])),
  };
}

export async function GET(request: Request) {
  try {
    if (!(await requireAdmin(request)))
      return noStore(
        { message: "Acesso restrito ao painel administrativo." },
        403,
      );
    const db = await getDb();
    const url = new URL(request.url);
    const query = (url.searchParams.get("q") ?? "")
      .trim()
      .toLocaleLowerCase("pt-BR")
      .slice(0, 80);
    const [items, serviceRows, professionalRows] = await Promise.all([
      db
        .select({
          id: portfolioItems.id,
          title: portfolioItems.title,
          description: portfolioItems.description,
          category: portfolioItems.category,
          serviceId: portfolioItems.serviceId,
          serviceName: services.name,
          professionalId: portfolioItems.professionalId,
          professionalName: professionals.name,
          mainImageUrl: portfolioItems.mainImageUrl,
          beforeImageUrl: portfolioItems.beforeImageUrl,
          afterImageUrl: portfolioItems.afterImageUrl,
          published: portfolioItems.published,
          featured: portfolioItems.featured,
          displayOrder: portfolioItems.displayOrder,
          createdAt: portfolioItems.createdAt,
        })
        .from(portfolioItems)
        .leftJoin(services, eq(services.id, portfolioItems.serviceId))
        .leftJoin(
          professionals,
          eq(professionals.id, portfolioItems.professionalId),
        )
        .orderBy(
          asc(portfolioItems.displayOrder),
          asc(portfolioItems.createdAt),
        )
        .limit(200),
      db
        .select({ id: services.id, name: services.name })
        .from(services)
        .where(eq(services.active, true))
        .orderBy(asc(services.name)),
      db
        .select({ id: professionals.id, name: professionals.name })
        .from(professionals)
        .where(eq(professionals.active, true))
        .orderBy(asc(professionals.name)),
    ]);
    const filtered = items.filter(
      (item) =>
        !query ||
        [item.title, item.category, item.description].some((value) =>
          value.toLocaleLowerCase("pt-BR").includes(query),
        ),
    );
    return noStore({
      items: filtered,
      services: serviceRows,
      professionals: professionalRows,
    });
  } catch {
    return noStore({ message: "Não foi possível carregar os trabalhos." }, 500);
  }
}

export async function POST(request: Request) {
  try {
    const admin = await requireAdmin(request);
    if (!admin)
      return noStore(
        { message: "Acesso restrito ao painel administrativo." },
        403,
      );
    const input = parsePortfolio(await request.json());
    if (!input)
      return noStore(
        {
          message:
            "Revise título, categoria, descrição, ordem e links HTTPS das imagens.",
        },
        400,
      );
    const { db, valid } = await validateReferences(input);
    if (!valid)
      return noStore(
        { message: "O serviço ou a profissional selecionada não existe mais." },
        400,
      );
    const id = crypto.randomUUID();
    const [inserted] = await db.batch([
      db
        .insert(portfolioItems)
        .values({ id, ...values(input) })
        .returning(),
      db
        .insert(auditLogs)
        .values({
          id: crypto.randomUUID(),
          userId: admin.id,
          action: "portfolio.created",
          entity: "portfolio_item",
          entityId: id,
          metadata: { published: input.published, featured: input.featured },
        }),
    ]);
    return noStore(
      { item: inserted[0], message: "Trabalho cadastrado com sucesso." },
      201,
    );
  } catch {
    return noStore({ message: "Não foi possível cadastrar o trabalho." }, 500);
  }
}

export async function PATCH(request: Request) {
  try {
    const admin = await requireAdmin(request);
    if (!admin)
      return noStore(
        { message: "Acesso restrito ao painel administrativo." },
        403,
      );
    const input = parsePortfolio(await request.json());
    if (!input?.id)
      return noStore({ message: "Revise os dados do trabalho." }, 400);
    const { db, valid } = await validateReferences(input);
    if (!valid)
      return noStore(
        { message: "O serviço ou a profissional selecionada não existe mais." },
        400,
      );
    const [current] = await db
      .select()
      .from(portfolioItems)
      .where(eq(portfolioItems.id, input.id))
      .limit(1);
    if (!current) return noStore({ message: "Trabalho não encontrado." }, 404);
    const changedFields = Object.entries(values(input))
      .filter(([key, value]) => current[key as keyof typeof current] !== value)
      .map(([key]) => key);
    const [updated] = await db.batch([
      db
        .update(portfolioItems)
        .set({ ...values(input), updatedAt: new Date() })
        .where(eq(portfolioItems.id, input.id))
        .returning(),
      db
        .insert(auditLogs)
        .values({
          id: crypto.randomUUID(),
          userId: admin.id,
          action: "portfolio.updated",
          entity: "portfolio_item",
          entityId: input.id,
          metadata: { changedFields },
        }),
    ]);
    return noStore({ item: updated[0], message: "Trabalho atualizado." });
  } catch {
    return noStore({ message: "Não foi possível atualizar o trabalho." }, 500);
  }
}
