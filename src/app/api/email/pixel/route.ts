import { type NextRequest } from "next/server";
import { trackServerEvent } from "@/lib/analytics-node";

// 1×1 transparent GIF
const GIF = Buffer.from("R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7", "base64");

export async function GET(request: NextRequest) {
  const uid = request.nextUrl.searchParams.get("uid");
  const type = request.nextUrl.searchParams.get("type") ?? "unknown";

  if (uid) {
    await trackServerEvent(uid, "alert_email_opened", { email_type: type });
  }

  return new Response(GIF, {
    headers: {
      "Content-Type": "image/gif",
      "Cache-Control": "no-store, no-cache, must-revalidate, private",
      Pragma: "no-cache",
    },
  });
}
