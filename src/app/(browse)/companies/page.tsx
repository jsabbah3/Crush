import Link from "next/link";
import { cn } from "@/lib/utils";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { Prisma } from "@/generated/prisma/client";
import { relevantCompanyWhere, relevantCompanySql } from "@/lib/company-relevance";
import { CompanyBrowser } from "@/components/company-browser";
import { YourList } from "@/components/your-list";
import { ShareWatchlistButton } from "@/components/share-watchlist-button";
import { PageHeader } from "@/components/brand";

export const metadata = {
  title: "Companies — Crush",
  description: "Browse companies and follow the ones you want to work for.",
};

export type Sort = "active" | "az" | "followed";

/** Signed-in header: one Companies page, two views — your list and everything. */
function CompaniesHeader({ active, userId, listCount }: { active: "list" | "browse"; userId: string; listCount: number }) {
  return (
    <div className="space-y-5">
      <PageHeader
        eyebrow={`${listCount} on your list`}
        title="Companies"
        action={listCount > 0 ? <ShareWatchlistButton userId={userId} /> : undefined}
      />
      <nav className="flex gap-6 border-b border-foreground/15" aria-label="Companies">
        {[
          { href: "/companies", label: "Your list", key: "list" },
          { href: "/companies?view=browse", label: "Browse all", key: "browse" },
        ].map((t) => (
          <Link
            key={t.key}
            href={t.href}
            aria-current={active === t.key ? "page" : undefined}
            className={cn(
              "-mb-px border-b-[3px] pb-2 text-sm font-semibold",
              active === t.key ? "border-primary text-foreground" : "border-transparent text-muted-foreground hover:text-foreground",
            )}
          >
            {t.label}
          </Link>
        ))}
      </nav>
    </div>
  );
}
const VALID_SORTS: Sort[] = ["active", "az", "followed"];

const FEATURED_VCS = [
  "a16z", "Sequoia", "YC", "Greylock", "Founders Fund",
  "Accel", "Kleiner Perkins", "Benchmark", "Index Ventures",
  "Bessemer", "Spark Capital", "Boldstart", "NEA",
  "Insight Partners", "Unicorn",
];

type BrowseCompany = {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  website: string | null;
  industry: string | null;
  headquarters: string | null;
  size: string | null;
  fundingStage: string | null;
  recentlyFundedAt: Date | null;
  activeJobs: number;
  _count: { trackedBy: number };
  jobs: { postedAt: Date | null }[];
};

type ActiveRow = {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  website: string | null;
  industry: string | null;
  headquarters: string | null;
  size: string | null;
  funding_stage: string | null;
  recently_funded_at: Date | null;
  tracked_by_count: bigint | number;
  active_jobs: bigint | number;
  last_posted_at: Date | null;
};

async function fetchByActive(q: string, industry: string, vc: string): Promise<BrowseCompany[]> {
  // Discovery surfaces only show companies with real signal (ATS source, VC
  // tag, or industry label) — self-serve "Add Company" has no relevance
  // check, so this is the actual gate. Rows that don't pass this stay in the
  // database and are still reachable by direct link.
  const conditions: Prisma.Sql[] = [relevantCompanySql];
  if (q) conditions.push(Prisma.sql`(c.name ILIKE ${`%${q}%`} OR c.description ILIKE ${`%${q}%`})`);
  if (industry) conditions.push(Prisma.sql`c.industry ILIKE ${industry}`);
  if (vc) conditions.push(Prisma.sql`${vc} = ANY(c.tags)`);
  // When filtering by VC or industry, only show companies that are actively hiring
  if (vc || industry) conditions.push(Prisma.sql`EXISTS (SELECT 1 FROM jobs j2 WHERE j2.company_id = c.id AND j2.status = 'ACTIVE'::job_status)`);

  const where = Prisma.sql`WHERE ${Prisma.join(conditions, " AND ")}`;

  const rows = await prisma.$queryRaw<ActiveRow[]>`
    SELECT
      c.id, c.name, c.slug, c.description, c.website, c.industry, c.headquarters,
      c.size::text AS size,
      c.funding_stage::text AS funding_stage,
      c.recently_funded_at,
      COUNT(DISTINCT tc.id)::int AS tracked_by_count,
      COUNT(DISTINCT CASE WHEN j.status = 'ACTIVE'::job_status THEN j.id END)::int AS active_jobs,
      MAX(CASE WHEN j.status = 'ACTIVE'::job_status THEN j.posted_at END) AS last_posted_at
    FROM companies c
    LEFT JOIN jobs j ON j.company_id = c.id
    LEFT JOIN tracked_companies tc ON tc.company_id = c.id
    ${where}
    GROUP BY c.id
    ORDER BY
      COUNT(CASE WHEN j.status = 'ACTIVE'::job_status THEN 1 END) DESC,
      MAX(CASE WHEN j.status = 'ACTIVE'::job_status THEN j.posted_at END) DESC NULLS LAST,
      c.name ASC
    LIMIT 100
  `;

  return rows.map((r) => ({
    id: r.id, name: r.name, slug: r.slug, description: r.description,
    website: r.website, industry: r.industry, headquarters: r.headquarters,
    size: r.size, fundingStage: r.funding_stage,
    recentlyFundedAt: r.recently_funded_at ? new Date(r.recently_funded_at) : null,
    activeJobs: Number(r.active_jobs),
    _count: { trackedBy: Number(r.tracked_by_count) },
    jobs: r.last_posted_at ? [{ postedAt: new Date(r.last_posted_at) }] : [],
  }));
}

async function fetchByOrm(q: string, industry: string, vc: string, sort: "az" | "followed"): Promise<BrowseCompany[]> {
  const rows = await prisma.company.findMany({
    where: {
      AND: [
        relevantCompanyWhere,
        ...(q ? [{ OR: [{ name: { contains: q, mode: "insensitive" as const } }, { description: { contains: q, mode: "insensitive" as const } }] }] : []),
        ...(industry ? [{ industry: { equals: industry, mode: "insensitive" as const } }] : []),
        ...(vc ? [{ tags: { has: vc } }] : []),
        // When filtering by VC or industry, only show actively hiring companies
        ...((vc || industry) ? [{ jobs: { some: { status: "ACTIVE" as const } } }] : []),
      ],
    },
    include: {
      _count: { select: { trackedBy: true, jobs: { where: { status: "ACTIVE" } } } },
      jobs: { where: { status: "ACTIVE" }, orderBy: { postedAt: "desc" }, take: 1, select: { postedAt: true } },
    },
    orderBy: sort === "followed" ? { trackedBy: { _count: "desc" } } : { name: "asc" },
    take: 100,
  });

  return rows.map((r) => ({
    id: r.id, name: r.name, slug: r.slug, description: r.description,
    website: r.website, industry: r.industry, headquarters: r.headquarters,
    size: r.size, fundingStage: r.fundingStage,
    recentlyFundedAt: r.recentlyFundedAt,
    activeJobs: r._count.jobs,
    _count: { trackedBy: r._count.trackedBy },
    jobs: r.jobs,
  }));
}

export default async function CompaniesPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; industry?: string; sort?: string; vc?: string; view?: string }>;
}) {
  const supabase = await createClient();
  const { data: { user: authUser } } = await supabase.auth.getUser();

  const { q = "", industry = "", sort: rawSort = "", vc = "", view = "" } = await searchParams;
  const sort: Sort = VALID_SORTS.includes(rawSort as Sort) ? (rawSort as Sort) : "active";

  // Logged-in users default to "following" view
  const isBrowse = !authUser || view === "browse";

  if (!isBrowse && authUser) {
    const listCount = await prisma.trackedCompany.count({ where: { userId: authUser.id } });
    return (
      <div className="space-y-8">
        <CompaniesHeader active="list" userId={authUser.id} listCount={listCount} />
        <YourList userId={authUser.id} />
      </div>
    );
  }

  // Browse view (logged out or ?view=browse)
  const [companies, tracked, industries, connectionRows] = await Promise.all([
    sort === "active" ? fetchByActive(q, industry, vc) : fetchByOrm(q, industry, vc, sort),
    authUser
      ? prisma.trackedCompany.findMany({ where: { userId: authUser.id }, select: { id: true, companyId: true } })
      : Promise.resolve([] as { id: string; companyId: string }[]),
    prisma.company.groupBy({
      by: ["industry"],
      where: { industry: { not: null } },
      _count: true,
      orderBy: { _count: { industry: "desc" } },
    }),
    authUser
      ? prisma.linkedInConnection.groupBy({
          by: ["companyId"],
          where: { userId: authUser.id, companyId: { not: null } },
          _count: { companyId: true },
        })
      : Promise.resolve([] as { companyId: string | null; _count: { companyId: number } }[]),
  ]);

  const trackedMap = new Map(tracked.map((t) => [t.companyId, { id: t.id }]));
  const connectionCounts: Record<string, number> = {};
  for (const row of connectionRows) {
    if (row.companyId) connectionCounts[row.companyId] = row._count.companyId;
  }

  return (
    <div className="space-y-6">
      {authUser ? (
        <CompaniesHeader active="browse" userId={authUser.id} listCount={tracked.length} />
      ) : (
        /* Logged out — proper page header instead of an orphaned tab */
        <PageHeader
          eyebrow="The files"
          title="Who would you leave for?"
          action={
            <span className="label-caps hidden items-center gap-1.5 text-muted-foreground sm:flex">
              <span className="size-1.5 rounded-full bg-moss" />
              Boards read every morning
            </span>
          }
        >
          Add the handful you mean it about. We write once, the day your exact role opens.
        </PageHeader>
      )}

      <CompanyBrowser
        companies={companies}
        trackedMap={trackedMap}
        industries={industries.map((i) => i.industry!)}
        vcs={FEATURED_VCS}
        userId={authUser?.id ?? null}
        initialQ={q}
        initialIndustry={industry}
        initialVc={vc}
        initialSort={sort}
        connectionCounts={connectionCounts}
      />
    </div>
  );
}
