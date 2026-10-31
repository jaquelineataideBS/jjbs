import { getCurrentUser } from "../../../../../lib/auth";
import { internalRoles } from "../../../../../lib/permissions";
import { sendPushToUsersDetailed } from "../../../../../lib/firebase-push";

function noStore(data: Record<string, unknown>, status = 200) {
  return Response.json(data, { status, headers: { "Cache-Control": "no-store" } });
}

export async function POST(request: Request) {
  const user = await getCurrentUser(request);
  if (!user) return noStore({ message: "Entre na conta do studio para testar notificações." }, 401);
  if (!internalRoles.includes(user.role as (typeof internalRoles)[number])) {
    return noStore({ message: "Este teste é exclusivo da equipe do studio." }, 403);
  }
  if (!process.env.NEXT_PUBLIC_FIREBASE_VAPID_KEY || !process.env.FIREBASE_SERVICE_ACCOUNT_JSON) {
    return noStore({ message: "A configuração do Firebase Push está incompleta no ambiente de produção." }, 503);
  }

  try {
    const result = await sendPushToUsersDetailed([user.id], {
      title: "Teste de notificações",
      body: "O Jaqueline Beauty Studio enviou este aviso para confirmar o push neste dispositivo.",
      url: "/admin",
    });
    if (result.reason === "no-installations") {
      return noStore({ message: "Este celular ainda não está inscrito. Ative as notificações neste dispositivo e tente novamente." }, 409);
    }
    if (!result.succeeded) {
      console.error("[push] studio test delivery incomplete", {
        attempted: result.attempted,
        failedCodes: result.failedCodes,
        reason: result.reason,
      });
      return noStore({
        message: "O Firebase não aceitou o envio para este celular.",
        codes: result.failedCodes,
      }, 502);
    }
    return noStore({ message: "O Firebase aceitou o envio para este celular.", accepted: result.succeeded });
  } catch (error) {
    console.error("[push] studio test delivery failed", {
      code: typeof error === "object" && error && "code" in error ? error.code : "unknown",
      message: error instanceof Error ? error.message : "Unknown Firebase push error",
    });
    return noStore({ message: "Falha ao enviar o teste de notificação. Consulte os logs do app." }, 502);
  }
}
