import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { createClient } from "@/lib/supabase/server";
import type { JobType } from "@/generated/prisma/enums";

export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const tracked = await prisma.trackedCompany.findMany({
    where: { userId: user.id },
    include: {
      company: true,
      _count: { select: { matches: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  return Response.json(tracked);
}

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json();
  const { companyId, keywords = [], jobTypes = [], remoteOnly = null, locationFilter = null, emailAlerts = true } = body;

  if (!companyId) {
    return Response.json({ error: "companyId required" }, { status: 400 });
  }

  const tracked = await prisma.trackedCompany.upsert({
    where: { userId_companyId: { userId: user.id, companyId } },
    create: {
      userId: user.id,
      companyId,
      keywords,
      jobTypes: jobTypes as JobType[],
      remoteOnly,
      locationFilter,
      emailAlerts,
    },
    update: {
      keywords,
      jobTypes: jobTypes as JobType[],
      remoteOnly,
      locationFilter,
      emailAlerts,
    },
  });

  return Response.json(tracked, { status: 201 });
}
