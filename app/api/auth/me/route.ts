import { getCurrentUser } from "../../../../lib/auth";

export async function GET(request: Request) {
  try {
    const user = await getCurrentUser(request);
    if (!user) return Response.json({ user: null }, { status: 401, headers: { "Cache-Control": "no-store" } });
    return Response.json({ user }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    const message = error instanceof Error ? error.message : "";
    if (message.includes("cloudflare:") || message.includes("D1 binding") || message.includes("ERR_UNSUPPORTED_ESM_URL_SCHEME")) return Response.json({ message: "O banco de dados ainda não está conectado neste ambiente." }, { status: 503, headers: { "Cache-Control": "no-store" } });
    return Response.json({ message: "Não foi possível carregar sua conta agora." }, { status: 500, headers: { "Cache-Control": "no-store" } });
  }
}
