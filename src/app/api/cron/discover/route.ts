import { type NextRequest } from "next/server";
import { runDiscovery } from "@/lib/discovery/run";

export const maxDuration = 300;

/** Daily company discovery: funding news + recent YC batches. See lib/discovery. */
export async function GET(request: NextRequest) {
  if (request.headers.get("authorization") !== `Bearer ${process.env.CRON_SECRET}`) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }
  return Response.json(await runDiscovery());
}
