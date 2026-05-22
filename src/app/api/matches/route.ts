import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const showDismissed = request.nextUrl.searchParams.get("dismissed") === "true";

  const matches = await prisma.match.findMany({
    where: {
      trackedCompany: { userId: user.id },
      dismissed: showDismissed ? undefined : false,
    },
    include: {
      job: { include: { company: true } },
      trackedCompany: { select: { id: true } },
    },
    orderBy: { createdAt: "desc" },
    take: 100,
  });

  return Response.json(matches);
}

export async function PATCH(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const { matchId, dismissed } = await request.json();

  const match = await prisma.match.findFirst({
    where: { id: matchId, trackedCompany: { userId: user.id } },
  });
  if (!match) return Response.json({ error: "Not found" }, { status: 404 });

  const updated = await prisma.match.update({
    where: { id: matchId },
    data: { dismissed },
  });

  return Response.json(updated);
}
