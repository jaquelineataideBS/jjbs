import { and, eq, gte, lte } from "drizzle-orm";
import { getDb } from "../../../../db";
import { openScheduleDates, professionals } from "../../../../db/schema";
import { requireAdmin } from "../../../../lib/admin";
import { todayInFortaleza } from "../../../../lib/scheduling";

function validDate(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(`${value}T12:00:00Z`);
  return Number.isFinite(date.getTime()) && date.toISOString().slice(0, 10) === value;
}
function respond(data: object, status = 200) { return Response.json(data, { status, headers: { "Cache-Control": "no-store" } }); }
export async function GET(request: Request) {
  if (!await requireAdmin(request)) return respond({ message: "Acesso restrito." }, 403);
  const url = new URL(request.url);
  const professionalId = url.searchParams.get("professionalId") ?? "";
  const month = url.searchParams.get("month") ?? "";
  if (!professionalId || !/^\d{4}-(0[1-9]|1[0-2])$/.test(month)) return respond({ message: "Selecione profissional e mês válidos." }, 400);
  try {
    const db = await getDb();
    const rows = await db.select({ date: openScheduleDates.date }).from(openScheduleDates).where(and(eq(openScheduleDates.professionalId, professionalId), gte(openScheduleDates.date, `${month}-01`), lte(openScheduleDates.date, `${month}-31`)));
    return respond({ dates: rows.map(row => row.date) });
  } catch { return respond({ message: "Não foi possível carregar as datas." }, 500); }
}
export async function POST(request: Request) {
  if (!await requireAdmin(request)) return respond({ message: "Acesso restrito." }, 403);
  try {
    const body: unknown = await request.json();
    if (!body || typeof body !== "object") return respond({ message: "Dados inválidos." }, 400);
    const { professionalId, date, open } = body as Record<string, unknown>;
    if (typeof professionalId !== "string" || !professionalId || typeof date !== "string" || !validDate(date) || date < todayInFortaleza() || typeof open !== "boolean") return respond({ message: "Selecione uma data válida." }, 400);
    const db = await getDb();
    const [professional] = await db.select({ id: professionals.id }).from(professionals).where(eq(professionals.id, professionalId)).limit(1);
    if (!professional) return respond({ message: "Profissional não encontrada." }, 404);
    if (open) await db.insert(openScheduleDates).values({ id: crypto.randomUUID(), professionalId, date }).onConflictDoNothing();
    else await db.delete(openScheduleDates).where(and(eq(openScheduleDates.professionalId, professionalId), eq(openScheduleDates.date, date)));
    return respond({ saved: true });
  } catch { return respond({ message: "Não foi possível salvar a data." }, 500); }
}
