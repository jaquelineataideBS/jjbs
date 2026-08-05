import { clearSessionCookie, removeCurrentSession } from "../../../../lib/auth";

export async function POST(request: Request) {
  try {
    await removeCurrentSession(request);
  } catch (error) {
    const message = error instanceof Error ? error.message : "";
    if (!message.includes("cloudflare:") && !message.includes("D1 binding") && !message.includes("ERR_UNSUPPORTED_ESM_URL_SCHEME")) return Response.json({ message: "Não foi possível encerrar a sessão." }, { status: 500 });
  }

  return Response.json({ ok: true }, { headers: { "Set-Cookie": clearSessionCookie(), "Cache-Control": "no-store" } });
}
