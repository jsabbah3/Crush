import Link from "next/link";
import { redirect } from "next/navigation";
import { Inbox } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { JobCard } from "@/components/job-card";
import { AiMatchScorer } from "@/components/ai-match-scorer";
import { cn } from "@/lib/utils";
import type { AppStatus } from "@/components/status-picker";
import { ApplicationStatus } from "@/generated/prisma/enums";

const TABS: { label: string; value: AppStatus }[] = [
  { label: "Interested",   value: "INTERESTED" },
  { label: "Applied",      value: "APPLIED" },
  { label: "Interviewing", value: "INTERVIEWING" },
  { label: "Offer",        value: "OFFER" },
  { label: "Rejected",     value: "REJECTED" },
];

export default async function MatchesPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { status: rawStatus } = await searchParams;
  const activeStatus: AppStatus =
    TABS.find((t) => t.value === rawStatus)?.value ?? "INTERESTED";

  const hasResume = await prisma.user.findUnique({
    where: { id: user.id },
    select: { resumeText: true },
  }).then((u) => !!u?.resumeText);

  const [matches] = await Promise.all([
    prisma.match.findMany({
      where: {
        trackedCompany: { userId: user.id },
        dismissed: false,
        applicationStatus: activeStatus as ApplicationStatus,
      },
      include: {
        job: { include: { company: true } },
      },
      orderBy: { createdAt: "desc" },
    }),
    // Mark all unseen matches as seen now that the user is viewing the page.
    prisma.match.updateMany({
      where: { trackedCompany: { userId: user.id }, seenAt: null },
      data: { seenAt: new Date() },
    }),
  ]);

  // Group by company for Interested view; flat list otherwise
  const grouped = activeStatus === "INTERESTED";
  const byCompany = new Map<string, typeof matches>();
  if (grouped) {
    for (const m of matches) {
      const name = m.job.company.name;
      if (!byCompany.has(name)) byCompany.set(name, []);
      byCompany.get(name)!.push(m);
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-heading text-3xl font-bold">📬 Matches</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Jobs that fit your criteria at companies you're tracking
        </p>
      </div>

      {/* Status tabs */}
      <div className="flex gap-1 border-b">
        {TABS.map((tab) => (
          <Link
            key={tab.value}
            href={`/matches?status=${tab.value}`}
            className={cn(
              "px-3 py-2 text-sm font-medium border-b-2 -mb-px transition-colors",
              activeStatus === tab.value
                ? "border-foreground text-foreground"
                : "border-transparent text-muted-foreground hover:text-foreground",
            )}
          >
            {tab.label}
          </Link>
        ))}
      </div>

      {/* AI match scoring — only shown on Interested tab when resume exists */}
      {activeStatus === "INTERESTED" && matches.length > 0 && (
        <AiMatchScorer
          jobs={matches.map((m) => ({
            matchId: m.id,
            jobId: m.jobId,
            title: m.job.title,
            company: m.job.company.name,
            description: m.job.description,
          }))}
        />
      )}
      {!hasResume && activeStatus === "INTERESTED" && matches.length > 0 && (
        <p className="text-xs text-muted-foreground">
          Add your resume in{" "}
          <Link href="/settings" className="underline underline-offset-2 hover:text-foreground">
            Settings
          </Link>{" "}
          to enable AI match scoring.
        </p>
      )}

      {matches.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 gap-3 text-center">
          <Inbox className="size-10 text-muted-foreground/40" />
          <p className="font-medium">
            {activeStatus === "INTERESTED" ? "No matches yet" : `No ${TABS.find(t => t.value === activeStatus)?.label.toLowerCase()} jobs`}
          </p>
          <p className="text-sm text-muted-foreground max-w-xs">
            {activeStatus === "INTERESTED"
              ? "When new jobs open at companies you're tracking and match your criteria, they'll appear here."
              : "Jobs you mark with this status will appear here."}
          </p>
        </div>
      ) : grouped ? (
        <div className="space-y-8">
          {Array.from(byCompany.entries()).map(([companyName, companyMatches]) => (
            <section key={companyName} className="space-y-2">
              <h2 className="text-sm font-medium text-muted-foreground">{companyName}</h2>
              {companyMatches.map((match) => (
                <JobCard
                  key={match.id}
                  job={match.job}
                  matchId={match.id}
                  applicationStatus={match.applicationStatus as AppStatus}
                />
              ))}
            </section>
          ))}
        </div>
      ) : (
        <div className="space-y-2">
          {matches.map((match) => (
            <JobCard
              key={match.id}
              job={match.job}
              matchId={match.id}
              applicationStatus={match.applicationStatus as AppStatus}
            />
          ))}
        </div>
      )}
    </div>
  );
}
