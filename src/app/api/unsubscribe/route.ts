import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";

const APP_URL = process.env.APP_URL ?? "https://crushco.app";

export async function GET(request: NextRequest) {
  const token = request.nextUrl.searchParams.get("token");
  if (!token) return htmlResponse("Invalid link.", true);

  const user = await prisma.user.findUnique({ where: { unsubscribeToken: token } });
  if (!user) return htmlResponse("This link is invalid or has already been used.", true);

  if (!user.alertsPaused) {
    await prisma.user.update({
      where: { id: user.id },
      data: { alertsPaused: true },
    });
  }

  return htmlResponse(
    `All alerts have been paused for <strong>${user.email}</strong>. You can re-enable them any time in your settings.`,
    false,
  );
}

function htmlResponse(message: string, isError: boolean): Response {
  const color = isError ? "#dc2626" : "#16a34a";
  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${isError ? "Invalid link" : "Alerts paused"} — Crush</title>
  <style>
    body { font-family: system-ui, sans-serif; display: flex; align-items: center;
           justify-content: center; min-height: 100vh; margin: 0; background: #f9fafb; }
    .card { background: #fff; border-radius: 12px; padding: 40px; max-width: 420px;
            width: 100%; box-shadow: 0 1px 3px rgba(0,0,0,.1); text-align: center; }
    .icon { font-size: 40px; margin-bottom: 16px; }
    h1 { margin: 0 0 12px; font-size: 20px; color: #111827; }
    p { margin: 0 0 24px; color: #6b7280; font-size: 15px; line-height: 1.5; }
    a { display: inline-block; background: #6366f1; color: #fff; padding: 10px 20px;
        border-radius: 8px; text-decoration: none; font-size: 14px; font-weight: 500; }
  </style>
</head>
<body>
  <div class="card">
    <div class="icon">${isError ? "⚠️" : "✓"}</div>
    <h1 style="color:${color}">${isError ? "Invalid link" : "Alerts paused"}</h1>
    <p>${message}</p>
    <a href="${APP_URL}/settings">Go to settings</a>
  </div>
</body>
</html>`;

  return new Response(html, {
    status: isError ? 400 : 200,
    headers: { "Content-Type": "text/html; charset=utf-8" },
  });
}
