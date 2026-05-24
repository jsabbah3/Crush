import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { doesJobMatch } from "@/lib/matching";
import { JobType } from "@/generated/prisma/enums";

export async function POST(request: NextRequest) {
  const apiKey = request.headers.get("x-api-key");
  if (apiKey !== process.env.INGEST_API_KEY) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const {
    companySlug,
    title,
    description,
    type,
    location,
    remote = false,
    salaryMin,
    salaryMax,
    url,
    postedAt,
  } = body;

  if (!companySlug || !title || !description || !type) {
    return Response.json({ error: "Missing required fields" }, { status: 400 });
  }

  const company = await prisma.company.findUnique({ where: { slug: companySlug } });
  if (!company) {
    return Response.json({ error: "Company not found" }, { status: 404 });
  }

  const slug = `${companySlug}-${title.toLowerCase().replace(/\s+/g, "-")}-${Date.now()}`;

  const job = await prisma.job.create({
    data: {
      title,
      slug,
      description,
      type: type as JobType,
      location: location ?? null,
      remote,
      salaryMin: salaryMin ?? null,
      salaryMax: salaryMax ?? null,
      url: url ?? null,
      postedAt: postedAt ? new Date(postedAt) : new Date(),
      companyId: company.id,
    },
  });

  // Find all users tracking this company and load their global prefs + roles
  const tracked = await prisma.trackedCompany.findMany({
    where: { companyId: company.id, emailAlerts: true },
    include: { user: { select: { defaultCriteria: true } } },
  });

  const userIds = [...new Set(tracked.map((tc) => tc.userId))];
  const roleRows = await prisma.trackedRole.findMany({
    where: { userId: { in: userIds } },
    select: { userId: true, title: true },
  });
  const rolesByUserId = new Map<string, string[]>();
  for (const r of roleRows) {
    if (!rolesByUserId.has(r.userId)) rolesByUserId.set(r.userId, []);
    rolesByUserId.get(r.userId)!.push(r.title);
  }

  type UserPrefs = { seniority?: string[]; remoteOnly?: boolean | null; locationFilter?: string | null };

  const matchIds: string[] = [];
  for (const tc of tracked) {
    const prefs = tc.user.defaultCriteria as UserPrefs | null;
    const userRoles = rolesByUserId.get(tc.userId) ?? [];
    if (doesJobMatch(job, userRoles, prefs?.seniority ?? [], prefs?.remoteOnly ?? null, prefs?.locationFilter ?? null)) {
      const match = await prisma.match.create({
        data: { trackedCompanyId: tc.id, jobId: job.id },
      });
      matchIds.push(match.id);
    }
  }

  // Matches are picked up by /api/cron/notify (instant) or /api/cron/digest (daily)
  return Response.json({ jobId: job.id, matchCount: matchIds.length });
}
