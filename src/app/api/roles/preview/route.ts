import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { doesJobMatch, expandRoleTitles } from "@/lib/matching";

const DAYS = 90;

type Prefs = { seniority?: string[]; remoteOnly?: boolean | null; locationFilter?: string | null } | null;

/**
 * "What would this role title have matched?" — shown while someone types a
 * role, so they can see a title is too broad (or too narrow) before saving it.
 * Same matcher and filters as alerts; postings from the last 90 days at the
 * companies on their list (or across Crush if the list is empty).
 */
export async function GET(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const title = (req.nextUrl.searchParams.get("title") ?? "").trim().slice(0, 80);
  if (title.length < 2) return NextResponse.json({ count: 0, examples: [], scope: "none" });

  const [tracked, dbUser] = await Promise.all([
    prisma.trackedCompany.findMany({ where: { userId: user.id }, select: { companyId: true } }),
    prisma.user.findUnique({ where: { id: user.id }, select: { defaultCriteria: true } }),
  ]);
  const prefs = dbUser?.defaultCriteria as Prefs;
  const companyIds = tracked.map((t) => t.companyId);
  const since = new Date(Date.now() - DAYS * 86_400_000);
  const variants = expandRoleTitles([title]).filter((v) => v.length >= 3);
  if (variants.length === 0) return NextResponse.json({ count: 0, examples: [], scope: "none" });

  const jobs = await prisma.job.findMany({
    where: {
      ...(companyIds.length ? { companyId: { in: companyIds } } : {}),
      AND: [
        { OR: [{ postedAt: { gte: since } }, { postedAt: null, createdAt: { gte: since } }] },
        { OR: variants.map((v) => ({ title: { contains: v, mode: "insensitive" as const } })) },
      ],
    },
    orderBy: [{ postedAt: { sort: "desc", nulls: "last" } }],
    take: 3000,
  });

  const hits = jobs.filter((j) =>
    doesJobMatch(j, [title], prefs?.seniority ?? [], prefs?.remoteOnly ?? null, prefs?.locationFilter ?? null),
  );
  const examples = [...new Set(hits.map((j) => j.title.trim()))].slice(0, 4);

  return NextResponse.json(
    { count: hits.length, examples, scope: companyIds.length ? "list" : "all", companies: companyIds.length },
    { headers: { "Cache-Control": "private, max-age=60" } },
  );
}
