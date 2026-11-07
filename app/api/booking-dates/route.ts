import { getPublicSchedule } from "../../../lib/public-schedule";

export const dynamic = "force-dynamic";

export async function GET() {
  const { days, failed } = await getPublicSchedule();

  return Response.json(
    { dates: days },
    {
      status: failed ? 503 : 200,
      headers: { "Cache-Control": "no-store" },
    },
  );
}
