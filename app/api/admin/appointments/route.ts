import { and, eq, inArray, ne, notInArray, sql } from "drizzle-orm";
import { getDb } from "../../../../db";
import { appointmentServices, appointments, auditLogs, businessHours, clients, loyaltyTransactions, notifications, openScheduleDates, professionalServices, services } from "../../../../db/schema";
import { requireAdmin } from "../../../../lib/admin";
import { normalizeWhatsapp } from "../../../../lib/masks";
import { sendAppointmentPush } from "../../../../lib/firebase-push";
import { addMinutes, buildConfiguredStartSlots, isClockTime, timeToMinutes, todayInFortaleza, weekdayForDate } from "../../../../lib/scheduling";
import { isHairSize, priceForHairSize } from "../../../../lib/hair-sizes";

const validStatuses = new Set(["pending_confirmation", "confirmed", "in_service", "completed", "cancelled_by_client", "cancelled_by_salon", "no_show", "rescheduled"]);

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

export async function PATCH(request: Request) {
  try {
    const admin = await requireAdmin(request);
    if (!admin) return Response.json({ message: "Acesso restrito ao painel administrativo." }, { status: 403, headers: { "Cache-Control": "no-store" } });
    const body: unknown = await request.json();
    if (!isRecord(body) || typeof body.id !== "string" || !validStatuses.has(String(body.status))) {
      return Response.json({ message: "Revise o status do agendamento." }, { status: 400, headers: { "Cache-Control": "no-store" } });
    }

    const db = await getDb();
    const [existing] = await db.select({
      id: appointments.id,
      clientId: appointments.clientId,
      professionalId: appointments.professionalId,
      serviceId: appointmentServices.serviceId,
      status: appointments.status,
      hairSize: appointments.hairSize,
      appointmentDate: appointments.appointmentDate,
      startTime: appointments.startTime,
      endTime: appointments.endTime,
      clientUserId: clients.userId,
      serviceName: services.name,
    }).from(appointments)
      .innerJoin(clients, eq(clients.id, appointments.clientId))
      .leftJoin(appointmentServices, eq(appointmentServices.appointmentId, appointments.id))
      .leftJoin(services, eq(services.id, appointmentServices.serviceId))
      .where(eq(appointments.id, body.id))
      .limit(1);
    if (!existing) return Response.json({ message: "Agendamento não encontrado." }, { status: 404, headers: { "Cache-Control": "no-store" } });

    const nextStatus = String(body.status);
    if ((body.appointmentDate !== undefined && typeof body.appointmentDate !== "string") ||
      (body.startTime !== undefined && typeof body.startTime !== "string") ||
      (body.serviceId !== undefined && typeof body.serviceId !== "string") ||
      (body.hairSize !== undefined && !isHairSize(body.hairSize))) {
      return Response.json({ message: "Escolha um serviço válido para o reagendamento." }, { status: 400, headers: { "Cache-Control": "no-store" } });
    }
    const nextDate = typeof body.appointmentDate === "string" ? body.appointmentDate.trim() : existing.appointmentDate;
    const nextStartTime = typeof body.startTime === "string" ? body.startTime.trim() : existing.startTime;
    const nextServiceId = typeof body.serviceId === "string" ? body.serviceId.trim() : existing.serviceId ?? "";
    const nextHairSize = isHairSize(body.hairSize) ? body.hairSize : isHairSize(existing.hairSize) ? existing.hairSize : null;
    const scheduleRequested = body.appointmentDate !== undefined || body.startTime !== undefined || body.serviceId !== undefined || body.hairSize !== undefined;
    const scheduleChanged = scheduleRequested && (
      nextDate !== existing.appointmentDate ||
      nextStartTime !== existing.startTime ||
      nextServiceId !== (existing.serviceId ?? "") ||
      nextHairSize !== existing.hairSize
    );
    const clientName = body.clientName === undefined ? null : typeof body.clientName === "string" ? body.clientName.trim() : "";
    const clientPhone = body.clientPhone === undefined ? null : normalizeWhatsapp(body.clientPhone);
    if ((clientName !== null && (clientName.length < 2 || clientName.length > 120)) ||
      (body.clientPhone !== undefined && !clientPhone)) {
      return Response.json({ message: "Informe um nome válido e um WhatsApp com DDD." }, { status: 400, headers: { "Cache-Control": "no-store" } });
    }
    const serviceChanged = nextServiceId !== (existing.serviceId ?? "");
    const sizeChanged = nextHairSize !== existing.hairSize;
    const pricingChanged = serviceChanged || sizeChanged;
    let nextService: { id: string; durationMinutes: number; priceCents: number | null } | null = null;
    let nextEndTime = existing.endTime;
    if (scheduleChanged) {
      if (!nextHairSize) return Response.json({ message: "Escolha o tamanho do cabelo para atualizar o agendamento." }, { status: 400, headers: { "Cache-Control": "no-store" } });
      const professionalId = existing.professionalId;
      if (!professionalId) {
        return Response.json({ message: "Este agendamento não tem uma profissional associada e não pode ser reagendado." }, { status: 409, headers: { "Cache-Control": "no-store" } });
      }
      if (!/^\d{4}-\d{2}-\d{2}$/.test(nextDate) || nextDate < todayInFortaleza() || !isClockTime(nextStartTime) || !nextServiceId) {
        return Response.json({ message: "Escolha uma nova data e um horário válidos." }, { status: 400, headers: { "Cache-Control": "no-store" } });
      }
      if (pricingChanged) {
        const [service] = await db.select({ id: services.id, durationMinutes: services.durationMinutes, priceCents: services.priceCents, sizePrices: services.sizePrices }).from(services)
          .innerJoin(professionalServices, eq(professionalServices.serviceId, services.id))
          .where(and(eq(services.id, nextServiceId), eq(services.active, true), eq(professionalServices.professionalId, professionalId)))
          .limit(1);
        if (!service) return Response.json({ message: "Este serviço não está ativo para a profissional escolhida." }, { status: 409, headers: { "Cache-Control": "no-store" } });
        nextService = { ...service, priceCents: priceForHairSize(service.sizePrices, nextHairSize, service.priceCents) };
      }
      const duration = nextService?.durationMinutes ?? timeToMinutes(existing.endTime) - timeToMinutes(existing.startTime);
      nextEndTime = addMinutes(nextStartTime, duration);
      if (!isClockTime(nextEndTime)) return Response.json({ message: "O atendimento não cabe nesse horário." }, { status: 409, headers: { "Cache-Control": "no-store" } });

      const [dateOverride] = await db.select({ serviceIds: openScheduleDates.serviceIds }).from(openScheduleDates)
        .where(and(eq(openScheduleDates.professionalId, professionalId), eq(openScheduleDates.date, nextDate))).limit(1);
      const linkedServices = serviceChanged
        ? [{ serviceId: nextServiceId }]
        : await db.select({ serviceId: appointmentServices.serviceId }).from(appointmentServices)
          .where(eq(appointmentServices.appointmentId, existing.id));
      if (!dateOverride) {
        return Response.json({ message: "Essa data ainda não foi liberada pela administração." }, { status: 409, headers: { "Cache-Control": "no-store" } });
      }
      if (dateOverride && dateOverride.serviceIds !== null && linkedServices.some((item) => !dateOverride.serviceIds?.includes(item.serviceId))) {
        return Response.json({ message: "O serviço deste agendamento não está liberado para essa data." }, { status: 409, headers: { "Cache-Control": "no-store" } });
      }
      const serviceRelations = await db.select({ serviceId: professionalServices.serviceId }).from(professionalServices)
        .where(and(eq(professionalServices.professionalId, professionalId), inArray(professionalServices.serviceId, linkedServices.map((item) => item.serviceId))));
      if (serviceRelations.length !== linkedServices.length) return Response.json({ message: "A profissional não atende esse serviço na data escolhida." }, { status: 409, headers: { "Cache-Control": "no-store" } });
      const periods = await db.select({ startTime: businessHours.startTime, endTime: businessHours.endTime, breakStart: businessHours.breakStart, breakEnd: businessHours.breakEnd }).from(businessHours)
        .where(and(eq(businessHours.professionalId, professionalId), eq(businessHours.weekday, weekdayForDate(nextDate)), eq(businessHours.active, true)));
      const appointmentRows = await db.select({ startTime: appointments.startTime, endTime: appointments.endTime }).from(appointments).where(and(
          eq(appointments.professionalId, professionalId), eq(appointments.appointmentDate, nextDate),
          notInArray(appointments.status, ["cancelled_by_client", "cancelled_by_salon", "rescheduled"]),
          ne(appointments.id, existing.id),
        ));
      const availableSlots = buildConfiguredStartSlots(periods, duration, appointmentRows);
      if (!availableSlots.includes(nextStartTime)) return Response.json({ message: "Esse horário não está disponível. Verifique o expediente e os outros agendamentos." }, { status: 409, headers: { "Cache-Control": "no-store" } });
    }
    const update = db.update(appointments)
      .set(scheduleChanged ? {
        appointmentDate: nextDate,
        startTime: nextStartTime,
        endTime: nextEndTime,
        hairSize: nextHairSize,
        ...(nextService ? { totalEstimatedCents: nextService.priceCents, promotionId: null, couponCode: null, discountCents: 0 } : {}),
        updatedAt: new Date(),
      } : { status: nextStatus, updatedAt: new Date() })
      .where(and(eq(appointments.id, existing.id), eq(appointments.status, existing.status)))
      .returning({ id: appointments.id, status: appointments.status });
    const updateResults = await db.batch([
      update,
      ...(clientName !== null || clientPhone ? [
        db.update(clients).set({
          ...(clientName !== null ? { name: clientName } : {}),
          ...(clientPhone ? { phone: clientPhone, whatsapp: clientPhone } : {}),
          updatedAt: new Date(),
        }).where(eq(clients.id, existing.clientId)),
      ] : []),
      ...(pricingChanged && nextService ? [
        db.delete(appointmentServices).where(eq(appointmentServices.appointmentId, existing.id)),
        db.insert(appointmentServices).values({
          id: crypto.randomUUID(),
          appointmentId: existing.id,
          serviceId: nextServiceId,
          priceCents: nextService.priceCents,
          durationMinutes: nextService.durationMinutes,
        }),
      ] : []),
    ]);
    const [updated] = updateResults[0] as { id: string; status: string }[];
    if (!updated) return Response.json({ message: "O agendamento foi atualizado em outro acesso. Recarregue a agenda." }, { status: 409, headers: { "Cache-Control": "no-store" } });

    if (nextStatus === "confirmed" && existing.status !== "confirmed" && existing.clientUserId) {
      const title = "Agendamento confirmado";
      const message = `Seu atendimento${existing.serviceName ? ` de ${existing.serviceName}` : ""} em ${existing.appointmentDate.split("-").reverse().join("/")}, às ${existing.startTime}, foi confirmado pelo studio.`;
      try {
        await db.insert(notifications).values({
          id: crypto.randomUUID(),
          userId: existing.clientUserId,
          appointmentId: existing.id,
          title,
          message,
          type: "confirmation",
          channel: "in_app",
          status: "sent",
          sentAt: new Date(),
          createdBy: admin.id,
        });
      } catch (error) {
        console.error("[notifications] appointment confirmation record failed", {
          message: error instanceof Error ? error.message : "Unknown notification error",
        });
      }
      await sendAppointmentPush([existing.clientUserId], {
        title,
        body: message,
        url: "/minha-conta#notificacoes",
      });
    }

    if (nextStatus === "completed" && existing.status !== "completed") {
      const [previousStamp] = await db.select({ id: loyaltyTransactions.id }).from(loyaltyTransactions)
        .where(and(eq(loyaltyTransactions.appointmentId, existing.id), eq(loyaltyTransactions.kind, "service"))).limit(1);
      const unlocked = !previousStamp && await db.execute(sql`
        WITH earned AS (
          INSERT INTO loyalty_transactions
            (id, client_id, appointment_id, kind, points_delta, stamps_delta, referrals_delta, description, created_by)
          VALUES
            (${crypto.randomUUID()}, ${existing.clientId}, ${existing.id}, 'service', 0, 1, 0, ${`Carimbo pelo atendimento${existing.serviceName ? ` de ${existing.serviceName}` : ""} concluído`}, ${admin.id})
          RETURNING client_id
        ), updated_loyalty AS (
          INSERT INTO loyalty_accounts (id, client_id, points, stamps, referrals)
          SELECT ${crypto.randomUUID()}, client_id, 0, 1, 0 FROM earned
          ON CONFLICT (client_id) DO UPDATE
            SET stamps = loyalty_accounts.stamps + 1, updated_at = now()
          RETURNING client_id, stamps
        ), logged AS (
          INSERT INTO audit_logs (id, user_id, action, entity, entity_id, metadata)
          SELECT ${crypto.randomUUID()}, ${admin.id}, 'loyalty.service_completed', 'client', client_id,
            ${JSON.stringify({ appointmentId: existing.id })}::jsonb
          FROM updated_loyalty
          RETURNING entity_id
        )
        SELECT stamps = 5 AS reward_unlocked FROM updated_loyalty
      `).then((result) => Array.isArray(result) && result.some((row) =>
        typeof row === "object" && row !== null && "reward_unlocked" in row && row.reward_unlocked === true,
      ));
      if (unlocked && existing.clientUserId) {
        const title = "Sua hidratação grátis está liberada";
        const message = "Você completou cinco atendimentos e ganhou uma hidratação gratuita. O studio registrará o resgate quando você usar o benefício.";
        try {
          await db.insert(notifications).values({ id: crypto.randomUUID(), userId: existing.clientUserId, appointmentId: existing.id, title, message, type: "promotion", channel: "in_app", status: "sent", sentAt: new Date(), createdBy: admin.id });
          await sendAppointmentPush([existing.clientUserId], { title, body: message, url: "/minha-conta" });
        } catch (error) {
          console.error("[loyalty] reward notification failed", { message: error instanceof Error ? error.message : "Unknown loyalty notification error" });
        }
      }
    }

    if (nextStatus === "completed" && existing.status !== "completed" && existing.clientUserId) {
      const title = "Avalie seu atendimento";
      const message = `Seu atendimento${existing.serviceName ? ` de ${existing.serviceName}` : ""} foi concluído. Conte como foi sua experiência com uma nota de 1 a 5 estrelas.`;
      try {
        await db.insert(notifications).values({
          id: crypto.randomUUID(),
          userId: existing.clientUserId,
          appointmentId: existing.id,
          title,
          message,
          type: "review_request",
          channel: "in_app",
          status: "sent",
          sentAt: new Date(),
          createdBy: admin.id,
        });
      } catch (error) {
        console.error("[notifications] review request record failed", {
          message: error instanceof Error ? error.message : "Unknown notification error",
        });
      }
      try {
        await sendAppointmentPush([existing.clientUserId], {
          title,
          body: message,
          url: "/minha-conta#avaliacoes",
        });
      } catch (error) {
        console.error("[notifications] review request push failed", {
          message: error instanceof Error ? error.message : "Unknown push error",
        });
      }
    }

    return Response.json({ appointment: updated }, { headers: { "Cache-Control": "no-store" } });
  } catch {
    return Response.json({ message: "Não foi possível atualizar o agendamento." }, { status: 500, headers: { "Cache-Control": "no-store" } });
  }
}
