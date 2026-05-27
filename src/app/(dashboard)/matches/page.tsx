import Link from "next/link";
import { redirect } from "next/navigation";
import { Inbox } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { JobCard } from "@/components/job-card";
import { RefreshMatchesButton } from "@/components/refresh-matches-button";

export default async function MatchesPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const trackedIds = await prisma.trackedCompany.findMany({
    where: { userId: user.id },
    select: { id: true },
  });

  const idList = trackedIds.map((t) => t.id);

  const [matches] = await Promise.all([
    idList.length > 0
      ? prisma.match.findMany({
          where: {
            trackedCompanyId: { in: idList },
            dismissed: false,
          },
          include: { job: { include: { company: true } } },
          orderBy: { createdAt: "desc" },
        })
      : (Promise.resolve([]) as ReturnType<typeof prisma.match.findMany<{ include: { job: { include: { company: true } } } }>>),
    // Mark all unseen matches as seen
    idList.length > 0
      ? prisma.match.updateMany({
          where: { trackedCompanyId: { in: idList }, seenAt: null },
          data: { seenAt: new Date() },
        })
      : Promise.resolve({ count: 0 }),
  ]);

  // Group by company
  const byCompany = new Map<string, typeof matches>();
  for (const m of matches) {
    const name = m.job.company.name;
    if (!byCompany.has(name)) byCompany.set(name, []);
    byCompany.get(name)!.push(m);
  }

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="font-heading text-3xl font-bold">📬 Matches</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Jobs that fit your criteria at companies you're tracking
          </p>
        </div>
        <RefreshMatchesButton className="pt-2" />
      </div>

      {matches.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 gap-3 text-center">
          <Inbox className="size-10 text-muted-foreground/40" />
          <p className="font-medium">No matches yet</p>
          <p className="text-sm text-muted-foreground max-w-xs">
            When new jobs open at companies you're tracking that match your criteria, they'll appear here.
          </p>
          <Link href="/companies" className="text-sm underline underline-offset-2 hover:text-foreground text-muted-foreground">
            Follow some companies →
          </Link>
        </div>
      ) : (
        <div className="space-y-8">
          {Array.from(byCompany.entries()).map(([companyName, companyMatches]) => (
            <section key={companyName} className="space-y-2">
              <h2 className="text-sm font-medium text-muted-foreground">{companyName}</h2>
              {companyMatches.map((match) => (
                <JobCard
                  key={match.id}
                  job={match.job}
                  matchId={match.id}
                  applicationStatus={match.applicationStatus as "INTERESTED"}
                />
              ))}
            </section>
          ))}
        </div>
      )}
    </div>
  );
}
