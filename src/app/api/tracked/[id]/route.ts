import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { createClient } from "@/lib/supabase/server";
import type { JobType } from "@/generated/prisma/enums";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const body = await request.json();
  const { keywords, jobTypes, remoteOnly, locationFilter, emailAlerts } = body;

  const existing = await prisma.trackedCompany.findFirst({
    where: { id, userId: user.id },
  });
  if (!existing) return Response.json({ error: "Not found" }, { status: 404 });

  const updated = await prisma.trackedCompany.update({
    where: { id },
    data: {
      ...(keywords !== undefined && { keywords }),
      ...(jobTypes !== undefined && { jobTypes: jobTypes as JobType[] }),
      ...(remoteOnly !== undefined && { remoteOnly }),
      ...(locationFilter !== undefined && { locationFilter }),
      ...(emailAlerts !== undefined && { emailAlerts }),
    },
  });

  return Response.json(updated);
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;

  const existing = await prisma.trackedCompany.findFirst({
    where: { id, userId: user.id },
  });
  if (!existing) return Response.json({ error: "Not found" }, { status: 404 });

  await prisma.trackedCompany.delete({ where: { id } });
  return new Response(null, { status: 204 });
}
