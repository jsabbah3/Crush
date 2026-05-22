import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const q = request.nextUrl.searchParams.get("q") ?? "";
  const industry = request.nextUrl.searchParams.get("industry") ?? "";

  const companies = await prisma.company.findMany({
    where: {
      ...(q && {
        OR: [
          { name: { contains: q, mode: "insensitive" } },
          { description: { contains: q, mode: "insensitive" } },
        ],
      }),
      ...(industry && { industry: { equals: industry, mode: "insensitive" } }),
    },
    include: {
      _count: { select: { jobs: true, trackedBy: true } },
    },
    orderBy: { name: "asc" },
    take: 50,
  });

  return Response.json(companies);
}
