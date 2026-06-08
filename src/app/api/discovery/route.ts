import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";

const PAGE_SIZE = 5;

export async function GET(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const page = Math.max(0, parseInt(req.nextUrl.searchParams.get("page") ?? "0", 10));

  const [trackedCompanies, trackedRoles, dbUser] = await Promise.all([
    prisma.trackedCompany.findMany({ where: { userId: user.id }, select: { companyId: true } }),
    prisma.trackedRole.findMany({ where: { userId: user.id }, select: { title: true } }),
    prisma.user.findUnique({ where: { id: user.id }, select: { defaultCriteria: true } }),
  ]);

  if (trackedRoles.length === 0) return NextResponse.json({ jobs: [], hasMore: false });

  const trackedCompanyIds = trackedCompanies.map((t) => t.companyId);
  const prefs = dbUser?.defaultCriteria as { remoteOnly?: boolean | null; locationFilter?: string | null } | null;

  const locationWhere: Record<string, unknown>[] = [];
  if (prefs?.remoteOnly === true) locationWhere.push({ remote: true });
  else if (prefs?.remoteOnly === false) locationWhere.push({ remote: false });
  if (prefs?.locationFilter) {
    const loc = prefs.locationFilter;
    locationWhere.push({
      OR: [
        { remote: true, location: null },
        { location: { contains: loc, mode: "insensitive" } },
      ],
    });
  }

  const where = {
    status: "ACTIVE" as const,
    companyId: trackedCompanyIds.length > 0 ? { notIn: trackedCompanyIds } : undefined,
    OR: trackedRoles.map((r) => ({ title: { contains: r.title, mode: "insensitive" as const } })),
    ...(locationWhere.length > 0 ? { AND: locationWhere } : {}),
  };

  const [jobs, total] = await Promise.all([
    prisma.job.findMany({
      where,
      include: { company: true },
      orderBy: { postedAt: "desc" },
      skip: page * PAGE_SIZE,
      take: PAGE_SIZE,
    }),
    prisma.job.count({ where }),
  ]);

  return NextResponse.json({
    jobs,
    hasMore: (page + 1) * PAGE_SIZE < total,
    total,
    page,
  });
}
