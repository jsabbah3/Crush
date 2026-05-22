import { NextRequest } from "next/server";
import { runIngestion } from "@/lib/ingestion";

export const maxDuration = 300;

export async function GET(request: NextRequest) {
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const result = await runIngestion();

  return Response.json(result);
}
