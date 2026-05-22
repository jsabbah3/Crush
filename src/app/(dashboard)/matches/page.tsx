import { redirect } from "next/navigation";
import { Inbox } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { JobCard } from "@/components/job-card";

export default async function MatchesPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const matches = await prisma.match.findMany({
    where: {
      trackedCompany: { userId: user.id },
      dismissed: false,
    },
    include: {
      job: { include: { company: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  // Group by company
  const byCompany = new Map<string, typeof matches>();
  for (const match of matches) {
    const name = match.job.company.name;
    if (!byCompany.has(name)) byCompany.set(name, []);
    byCompany.get(name)!.push(match);
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-xl font-semibold">Matches</h1>
        <p className="text-sm text-muted-foreground mt-0.5">
          Jobs that fit your criteria at companies you're tracking
        </p>
      </div>

      {matches.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 gap-3 text-center">
          <Inbox className="size-10 text-muted-foreground/40" />
          <p className="font-medium">No matches yet</p>
          <p className="text-sm text-muted-foreground max-w-xs">
            When new jobs open at companies you're tracking and match your criteria, they'll appear here.
          </p>
        </div>
      ) : (
        <div className="space-y-8">
          {Array.from(byCompany.entries()).map(([companyName, companyMatches]) => (
            <section key={companyName} className="space-y-3">
              <h2 className="text-sm font-medium text-muted-foreground">{companyName}</h2>
              <div className="space-y-2">
                {companyMatches.map((match) => (
                  <JobCard key={match.id} job={match.job} matchId={match.id} />
                ))}
              </div>
            </section>
          ))}
        </div>
      )}
    </div>
  );
}
