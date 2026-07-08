import { type NextRequest } from "next/server";
import { captureRoleSnapshots } from "@/lib/role-snapshots";

export const maxDuration = 300;

export async function GET(request: NextRequest) {
  if (request.headers.get("authorization") !== `Bearer ${process.env.CRON_SECRET}`) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const result = await captureRoleSnapshots();
  return Response.json(result);
}
