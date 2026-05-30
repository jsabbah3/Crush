import { type NextRequest, NextResponse } from "next/server";
import { trackServerEvent } from "@/lib/analytics-node";

const APP_ORIGIN = new URL(process.env.APP_URL ?? "https://crushco.app").origin;

function isSafeDestination(url: string): boolean {
  try {
    return new URL(url).origin === APP_ORIGIN;
  } catch {
    return url.startsWith("/");
  }
}

export async function GET(request: NextRequest) {
  const uid = request.nextUrl.searchParams.get("uid");
  const rawUrl = request.nextUrl.searchParams.get("url");
  const type = request.nextUrl.searchParams.get("type") ?? "unknown";

  // Validate destination before tracking or redirecting
  const destination =
    rawUrl && isSafeDestination(rawUrl) ? rawUrl : `${APP_ORIGIN}/dashboard`;

  if (uid) {
    await trackServerEvent(uid, "alert_email_clicked", {
      email_type: type,
      destination_url: destination,
    });
  }

  return NextResponse.redirect(destination, { status: 302 });
}
