import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { CompanyBrowser } from "@/components/company-browser";

export const metadata = {
  title: "Companies — Crush",
  description: "Browse companies and follow the ones you want to work for.",
};

export default async function CompaniesPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; industry?: string }>;
}) {
  const supabase = await createClient();
  const {
    data: { user: authUser },
  } = await supabase.auth.getUser();

  const { q = "", industry = "" } = await searchParams;

  const [companies, tracked, industries, dbUser] = await Promise.all([
    prisma.company.findMany({
      where: {
        ...(q && {
          OR: [
            { name: { contains: q, mode: "insensitive" } },
            { description: { contains: q, mode: "insensitive" } },
          ],
        }),
        ...(industry && { industry: { equals: industry, mode: "insensitive" } }),
      },
      include: { _count: { select: { trackedBy: true } } },
      orderBy: { name: "asc" },
      take: 60,
    }),
    authUser
      ? prisma.trackedCompany.findMany({
          where: { userId: authUser.id },
          select: {
            id: true,
            companyId: true,
            keywords: true,
            jobTypes: true,
            remoteOnly: true,
            locationFilter: true,
            emailAlerts: true,
          },
        })
      : [],
    prisma.company.findMany({
      where: { industry: { not: null } },
      select: { industry: true },
      distinct: ["industry"],
      orderBy: { industry: "asc" },
    }),
    authUser
      ? prisma.user.findUnique({
          where: { id: authUser.id },
          select: { defaultCriteria: true },
        })
      : null,
  ]);

  const trackedMap = new Map(tracked.map((t) => [t.companyId, t]));
  const defaultCriteria = dbUser?.defaultCriteria as {
    keywords: string[];
    remoteOnly: boolean | null;
    locationFilter: string | null;
  } | null ?? null;

  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <h1 className="font-heading text-3xl font-bold">🏢 Companies</h1>
        <p className="text-sm text-muted-foreground">
          Follow the companies you want to work for. We'll alert you when a matching role opens.
        </p>
      </div>

      <CompanyBrowser
        companies={companies}
        trackedMap={trackedMap}
        industries={industries.map((i) => i.industry!)}
        userId={authUser?.id ?? null}
        initialQ={q}
        initialIndustry={industry}
        defaultCriteria={defaultCriteria}
      />
    </div>
  );
}
