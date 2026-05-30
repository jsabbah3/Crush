import { type NextRequest } from "next/server";
import { runFundingSignalIngest } from "@/lib/funding-signals";

export const maxDuration = 300;

export async function GET(request: NextRequest) {
  if (request.headers.get("authorization") !== `Bearer ${process.env.CRON_SECRET}`) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const result = await runFundingSignalIngest();
  return Response.json(result);
}
