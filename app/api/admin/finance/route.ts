import { asc, desc, eq, inArray } from "drizzle-orm";
import { getDb } from "../../../../db";
import {
  appointmentServices,
  appointments,
  auditLogs,
  clients,
  paymentMethods,
  payments,
  professionals,
  services,
} from "../../../../db/schema";
import { requireAdmin } from "../../../../lib/admin";

const validKinds = new Set(["deposit", "balance", "full"]);
const validStatuses = new Set([
  "pending",
  "partially_paid",
  "paid",
  "refunded",
  "cancelled",
]);
const receivedStatuses = new Set(["partially_paid", "paid"]);

type PaymentInput = {
  id?: string;
  appointmentId: string;
  paymentMethodId: string | null;
  kind: string;
  amountCents: number;
  discountCents: number;
  surchargeCents: number;
  status: string;
  paidAt: Date | null;
  transactionReference: string | null;
  notes: string | null;
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

function textOrNull(value: unknown, maxLength: number) {
  if (value == null || value === "") return null;
  if (typeof value !== "string") return undefined;
  const text = value.trim();
  return text.length <= maxLength ? text || null : undefined;
}

function parseCents(value: unknown) {
  return typeof value === "number" &&
    Number.isSafeInteger(value) &&
    value >= 0 &&
    value <= 100_000_000
    ? value
    : null;
}

function parsePayment(value: unknown): PaymentInput | null {
  if (!isRecord(value)) return null;
  const id = typeof value.id === "string" ? value.id.trim() : undefined;
  const appointmentId =
    typeof value.appointmentId === "string" ? value.appointmentId.trim() : "";
  const paymentMethodId = textOrNull(value.paymentMethodId, 80);
  const transactionReference = textOrNull(value.transactionReference, 160);
  const notes = textOrNull(value.notes, 1000);
  const amountCents = parseCents(value.amountCents);
  const discountCents = parseCents(value.discountCents ?? 0);
  const surchargeCents = parseCents(value.surchargeCents ?? 0);
  const kind = typeof value.kind === "string" ? value.kind : "";
  const status = typeof value.status === "string" ? value.status : "";
  let paidAt: Date | null = null;
  if (value.paidAt) {
    paidAt = new Date(String(value.paidAt));
    if (Number.isNaN(paidAt.getTime())) return null;
  } else if (receivedStatuses.has(status)) {
    paidAt = new Date();
  }
  if (
    !appointmentId ||
    paymentMethodId === undefined ||
    transactionReference === undefined ||
    notes === undefined ||
    amountCents === null ||
    discountCents === null ||
    surchargeCents === null ||
    !validKinds.has(kind) ||
    !validStatuses.has(status)
  )
    return null;
  return {
    id,
    appointmentId,
    paymentMethodId,
    kind,
    amountCents,
    discountCents,
    surchargeCents,
    status,
    paidAt,
    transactionReference,
    notes,
  };
}

function localDateKey(date: Date) {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Fortaleza",
  }).format(date);
}

function addDays(dateKey: string, days: number) {
  const date = new Date(`${dateKey}T12:00:00-03:00`);
  date.setUTCDate(date.getUTCDate() + days);
  return localDateKey(date);
}

function paymentValues(input: PaymentInput) {
  return {
    appointmentId: input.appointmentId,
    paymentMethodId: input.paymentMethodId,
    kind: input.kind,
    amountCents: input.amountCents,
    discountCents: input.discountCents,
    surchargeCents: input.surchargeCents,
    status: input.status,
    paidAt: input.paidAt,
    transactionReference: input.transactionReference,
    notes: input.notes,
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
    const appointmentRows = await db
      .select({
        id: appointments.id,
        appointmentDate: appointments.appointmentDate,
        startTime: appointments.startTime,
        status: appointments.status,
        totalEstimatedCents: appointments.totalEstimatedCents,
        clientName: clients.name,
        professionalName: professionals.name,
      })
      .from(appointments)
      .innerJoin(clients, eq(clients.id, appointments.clientId))
      .leftJoin(professionals, eq(professionals.id, appointments.professionalId))
      .orderBy(desc(appointments.appointmentDate), desc(appointments.startTime))
      .limit(500);
    const appointmentIds = appointmentRows.map((row) => row.id);
    const [methodRows, paymentRows, serviceRows] = await Promise.all([
      db.select().from(paymentMethods).orderBy(asc(paymentMethods.displayOrder)),
      db
        .select({
          id: payments.id,
          appointmentId: payments.appointmentId,
          paymentMethodId: payments.paymentMethodId,
          methodName: paymentMethods.name,
          kind: payments.kind,
          amountCents: payments.amountCents,
          discountCents: payments.discountCents,
          surchargeCents: payments.surchargeCents,
          status: payments.status,
          paidAt: payments.paidAt,
          transactionReference: payments.transactionReference,
          notes: payments.notes,
          createdAt: payments.createdAt,
        })
        .from(payments)
        .leftJoin(paymentMethods, eq(paymentMethods.id, payments.paymentMethodId))
        .orderBy(desc(payments.createdAt))
        .limit(3000),
      appointmentIds.length
        ? db
            .select({
              appointmentId: appointmentServices.appointmentId,
              serviceName: services.name,
            })
            .from(appointmentServices)
            .innerJoin(services, eq(services.id, appointmentServices.serviceId))
            .where(inArray(appointmentServices.appointmentId, appointmentIds))
        : Promise.resolve([]),
    ]);

    const serviceNames = new Map<string, string[]>();
    for (const row of serviceRows) {
      const names = serviceNames.get(row.appointmentId) ?? [];
      if (!names.includes(row.serviceName)) names.push(row.serviceName);
      serviceNames.set(row.appointmentId, names);
    }
    const paymentsByAppointment = new Map<string, typeof paymentRows>();
    for (const payment of paymentRows) {
      const rows = paymentsByAppointment.get(payment.appointmentId) ?? [];
      rows.push(payment);
      paymentsByAppointment.set(payment.appointmentId, rows);
    }

    const appointmentMap = new Map(appointmentRows.map((row) => [row.id, row]));
    const enrichedAppointments = appointmentRows.map((appointment) => {
      const rows = paymentsByAppointment.get(appointment.id) ?? [];
      const effective = rows.filter(
        (row) => row.status !== "cancelled" && row.status !== "refunded",
      );
      const discountCents = effective.reduce(
        (sum, row) => sum + row.discountCents,
        0,
      );
      const surchargeCents = effective.reduce(
        (sum, row) => sum + row.surchargeCents,
        0,
      );
      const paidCents = effective
        .filter((row) => receivedStatuses.has(row.status))
        .reduce((sum, row) => sum + row.amountCents, 0);
      const targetCents = Math.max(
        (appointment.totalEstimatedCents ?? 0) - discountCents + surchargeCents,
        0,
      );
      return {
        ...appointment,
        serviceName: serviceNames.get(appointment.id)?.join(", ") ?? "Serviço",
        discountCents,
        surchargeCents,
        paidCents,
        remainingCents: Math.max(targetCents - paidCents, 0),
        financialStatus:
          paidCents <= 0
            ? "pending"
            : paidCents < targetCents
              ? "partially_paid"
              : "paid",
      };
    });

    const received = paymentRows.filter(
      (row) => receivedStatuses.has(row.status) && row.paidAt,
    );
    const today = localDateKey(new Date());
    const weekStart = addDays(today, -6);
    const month = today.slice(0, 7);
    const revenue = (predicate: (dateKey: string) => boolean) =>
      received.reduce((sum, row) => {
        const key = localDateKey(row.paidAt as Date);
        return predicate(key) ? sum + row.amountCents : sum;
      }, 0);
    const discountsCents = paymentRows
      .filter((row) => row.status !== "cancelled" && row.status !== "refunded")
      .reduce((sum, row) => sum + row.discountCents, 0);
    const pendingCents = enrichedAppointments.reduce(
      (sum, row) => sum + row.remainingCents,
      0,
    );
    const groupRevenue = (label: (row: (typeof paymentRows)[number]) => string) => {
      const grouped = new Map<string, number>();
      for (const row of received) {
        const name = label(row);
        grouped.set(name, (grouped.get(name) ?? 0) + row.amountCents);
      }
      return [...grouped.entries()]
        .map(([name, amountCents]) => ({ name, amountCents }))
        .sort((a, b) => b.amountCents - a.amountCents);
    };

    const transactions = paymentRows.map((row) => {
      const appointment = appointmentMap.get(row.appointmentId);
      return {
        ...row,
        clientName: appointment?.clientName ?? "Cliente",
        appointmentDate: appointment?.appointmentDate ?? "",
        professionalName: appointment?.professionalName ?? "Sem profissional",
        serviceName:
          serviceNames.get(row.appointmentId)?.join(", ") ?? "Serviço",
      };
    });
    return noStore({
      methods: methodRows,
      appointments: enrichedAppointments,
      transactions,
      report: {
        todayCents: revenue((key) => key === today),
        weekCents: revenue((key) => key >= weekStart && key <= today),
        monthCents: revenue((key) => key.startsWith(month)),
        pendingCents,
        discountsCents,
        byMethod: groupRevenue((row) => row.methodName ?? "Não informado"),
        byService: groupRevenue(
          (row) => serviceNames.get(row.appointmentId)?.join(", ") ?? "Serviço",
        ),
        byProfessional: groupRevenue(
          (row) => appointmentMap.get(row.appointmentId)?.professionalName ?? "Sem profissional",
        ),
      },
    });
  } catch {
    return noStore(
      { message: "Não foi possível carregar o financeiro." },
      500,
    );
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
    const input = parsePayment(await request.json());
    if (!input)
      return noStore(
        { message: "Revise o agendamento, valor, método, status e data." },
        400,
      );
    const db = await getDb();
    const [appointment] = await db
      .select({ id: appointments.id })
      .from(appointments)
      .where(eq(appointments.id, input.appointmentId))
      .limit(1);
    if (!appointment)
      return noStore({ message: "Agendamento não encontrado." }, 404);
    if (input.paymentMethodId) {
      const [method] = await db
        .select({ id: paymentMethods.id })
        .from(paymentMethods)
        .where(eq(paymentMethods.id, input.paymentMethodId))
        .limit(1);
      if (!method)
        return noStore({ message: "Método de pagamento inválido." }, 400);
    }
    const id = crypto.randomUUID();
    const [created] = await db.batch([
      db
        .insert(payments)
        .values({ id, createdBy: admin.id, ...paymentValues(input) })
        .returning(),
      db.insert(auditLogs).values({
        id: crypto.randomUUID(),
        userId: admin.id,
        action: "payment.created",
        entity: "payment",
        entityId: id,
        metadata: { appointmentId: input.appointmentId, status: input.status },
      }),
    ]);
    return noStore(
      { payment: created[0], message: "Lançamento financeiro registrado." },
      201,
    );
  } catch {
    return noStore(
      { message: "Não foi possível registrar o lançamento." },
      500,
    );
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
    const body: unknown = await request.json();
    if (!isRecord(body)) return noStore({ message: "Dados inválidos." }, 400);
    const db = await getDb();
    if (body.resource === "method") {
      if (typeof body.id !== "string" || typeof body.active !== "boolean")
        return noStore({ message: "Revise o método de pagamento." }, 400);
      const [updated] = await db
        .update(paymentMethods)
        .set({ active: body.active, updatedAt: new Date() })
        .where(eq(paymentMethods.id, body.id))
        .returning();
      if (!updated)
        return noStore({ message: "Método não encontrado." }, 404);
      await db.insert(auditLogs).values({
        id: crypto.randomUUID(),
        userId: admin.id,
        action: "payment_method.updated",
        entity: "payment_method",
        entityId: body.id,
        metadata: { active: body.active },
      });
      return noStore({ method: updated, message: "Método atualizado." });
    }

    const input = parsePayment(body);
    if (!input?.id)
      return noStore({ message: "Revise os dados do lançamento." }, 400);
    const [current] = await db
      .select()
      .from(payments)
      .where(eq(payments.id, input.id))
      .limit(1);
    if (!current)
      return noStore({ message: "Lançamento não encontrado." }, 404);
    const [updated] = await db.batch([
      db
        .update(payments)
        .set({ ...paymentValues(input), updatedAt: new Date() })
        .where(eq(payments.id, input.id))
        .returning(),
      db.insert(auditLogs).values({
        id: crypto.randomUUID(),
        userId: admin.id,
        action: "payment.updated",
        entity: "payment",
        entityId: input.id,
        metadata: { previousStatus: current.status, status: input.status },
      }),
    ]);
    return noStore({
      payment: updated[0],
      message: "Lançamento financeiro atualizado.",
    });
  } catch {
    return noStore(
      { message: "Não foi possível atualizar o lançamento." },
      500,
    );
  }
}
