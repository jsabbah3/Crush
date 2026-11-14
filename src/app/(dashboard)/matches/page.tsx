import Link from "next/link";
import { redirect } from "next/navigation";
import { Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { RefreshMatchesButton } from "@/components/refresh-matches-button";
import { MatchesList } from "@/components/matches-list";
import { EmptyState, PageHeader } from "@/components/brand";

export default async function MatchesPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const trackedIds = await prisma.trackedCompany.findMany({
    where: { userId: user.id },
    select: { id: true },
  });

  const idList = trackedIds.map((t) => t.id);

  const [matches, roleCount] = await Promise.all([
    idList.length > 0
      ? prisma.match.findMany({
          where: {
            trackedCompanyId: { in: idList },
            dismissed: false,
          },
          select: {
            id: true,
            applicationStatus: true,
            seenAt: true,
            // Only what a match card renders. The job description stays on
            // the server — this list is handed to a client component, and a
            // few hundred descriptions is megabytes nobody reads here.
            job: {
              select: {
                id: true, title: true, type: true, location: true, remote: true,
                salaryMin: true, salaryMax: true, currency: true, url: true,
                postedAt: true, companyId: true,
                company: { select: { name: true, slug: true, website: true } },
              },
            },
          },
          orderBy: { createdAt: "desc" },
        })
      : [],
    prisma.trackedRole.count({ where: { userId: user.id } }),
  ]);

  // Mark everything seen — but only after the read above, so this visit still
  // knows which ones were new. (Run together, the read raced the write and the
  // NEW state was a coin flip.)
  if (matches.some((m) => m.seenAt === null)) {
    await prisma.match.updateMany({
      where: { trackedCompanyId: { in: idList }, seenAt: null },
      data: { seenAt: new Date() },
    });
  }

  const hasCompanies = idList.length > 0;
  const hasRoles = roleCount > 0;

  // Who does the user already know at these companies? First-degree
  // LinkedIn connections (imported CSV), grouped per company.
  const matchCompanyIds = [...new Set(matches.map((m) => m.job.companyId))];
  const [connectionGroups, totalConnections] = await Promise.all([
    matchCompanyIds.length > 0
      ? prisma.linkedInConnection.groupBy({
          by: ["companyId"],
          where: { userId: user.id, companyId: { in: matchCompanyIds } },
          _count: { _all: true },
        })
      : Promise.resolve([]),
    prisma.linkedInConnection.count({ where: { userId: user.id } }),
  ]);
  const countByCompanyId = new Map(
    connectionGroups.map((g) => [g.companyId, g._count._all]),
  );
  // MatchesList groups by company slug — key the counts the same way.
  const networkBySlug: Record<string, number> = {};
  for (const m of matches) {
    const count = countByCompanyId.get(m.job.companyId);
    if (count) networkBySlug[m.job.company.slug] = count;
  }

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Matches"
        title="Matches"
        action={<RefreshMatchesButton />}
      >
        Roles that fit what you asked for, at the companies on your list.
      </PageHeader>

      {matches.length > 0 && totalConnections === 0 && (
        <div className="flex items-start gap-3 border-l-[3px] border-foreground bg-wash/60 px-4 py-3">
          <Users className="mt-0.5 size-4 shrink-0 text-graphite" />
          <p className="text-sm leading-relaxed">
            You might already know someone at these companies. Import your LinkedIn
            connections and we&apos;ll show who can refer you — most roles are landed
            through people, not applications.{" "}
            <Link href="/settings" className="font-semibold underline decoration-primary decoration-2 underline-offset-2 hover:text-primary">
              Import connections
            </Link>
          </p>
        </div>
      )}

      {matches.length === 0 ? (
        hasCompanies && !hasRoles ? (
          // Tracking companies but no target role → nothing will ever match
          // until they add one. This is the load-bearing prompt for the
          // "no roles = no matches" rule.
          <EmptyState
            kicker="Which role?"
            title="Tell us the role"
            action={
              <Link href="/settings">
                <Button>Add your roles</Button>
              </Link>
            }
          >
            You have companies on your list, but we don&apos;t know which job you want at them — so nothing can match yet. Add a title or two and we&apos;ll email you the day one opens.
          </EmptyState>
        ) : !hasCompanies ? (
          <EmptyState
            kicker="Your list is empty"
            title="Nobody on your list yet"
            action={
              <Link href="/companies?view=browse">
                <Button>Browse companies</Button>
              </Link>
            }
          >
            Name the companies you&apos;d actually leave for, and we&apos;ll read their job boards so you don&apos;t have to.
          </EmptyState>
        ) : (
          <EmptyState
            kicker="Nothing new today"
            title="Nothing yet. That's normal."
            action={
              <>
                <Link href="/dashboard">
                  <Button variant="outline">See how often each one hires</Button>
                </Link>
                <Link href="/companies">
                  <Button variant="ghost" className="text-muted-foreground">Add more companies</Button>
                </Link>
              </>
            }
          >
            You&apos;re set up. We read your companies&apos; boards every morning; the day a role fits, it lands here and in your inbox.
          </EmptyState>
        )
      ) : (
        <MatchesList matches={matches} networkBySlug={networkBySlug} />
      )}
    </div>
  );
}
