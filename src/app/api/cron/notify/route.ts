import { NextRequest } from "next/server";
import { dispatchInstantAlerts } from "@/lib/notifications";

export const maxDuration = 60;

export async function GET(request: NextRequest) {
  if (request.headers.get("authorization") !== `Bearer ${process.env.CRON_SECRET}`) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const result = await dispatchInstantAlerts();
  return Response.json(result);
}
