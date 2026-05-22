import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { CompanyGrid } from "@/components/company-grid";

export default async function CompaniesPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; industry?: string }>;
}) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { q = "", industry = "" } = await searchParams;

  const [companies, tracked] = await Promise.all([
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
      include: { _count: { select: { jobs: true } } },
      orderBy: { name: "asc" },
      take: 60,
    }),
    prisma.trackedCompany.findMany({
      where: { userId: user.id },
      select: { id: true, companyId: true },
    }),
  ]);

  const trackedMap = new Map(tracked.map((t) => [t.companyId, t.id]));

  const industries = await prisma.company.findMany({
    where: { industry: { not: null } },
    select: { industry: true },
    distinct: ["industry"],
    orderBy: { industry: "asc" },
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold">Companies</h1>
        <p className="text-sm text-muted-foreground mt-0.5">
          Follow companies and get alerted when matching roles open.
        </p>
      </div>
      <CompanyGrid
        companies={companies}
        trackedMap={trackedMap}
        industries={industries.map((i) => i.industry!)}
        initialQ={q}
        initialIndustry={industry}
      />
    </div>
  );
}
