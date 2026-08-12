import { getPublicSettings } from "../../../lib/public-settings";

export async function GET() {
  return Response.json({ settings: await getPublicSettings() }, { headers: { "Cache-Control": "no-store" } });
}
