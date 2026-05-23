import Link from "next/link";
import { redirect } from "next/navigation";
import { ExternalLink, ClipboardList } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { Badge } from "@/components/ui/badge";
import { StatusPicker, STATUS_CONFIG, type AppStatus } from "@/components/status-picker";
import { ApplicationStatus } from "@/generated/prisma/enums";

export const metadata = {
  title: "Applications — Crush",
};

const ACTIVE_STATUSES: ApplicationStatus[] = [
  ApplicationStatus.APPLIED,
  ApplicationStatus.INTERVIEWING,
  ApplicationStatus.OFFER,
  ApplicationStatus.REJECTED,
];

function StatusBadge({ status }: { status: AppStatus }) {
  const cfg = STATUS_CONFIG[status];
  return (
    <span className={`inline-flex items-center gap-1.5 text-xs font-medium ${cfg.text}`}>
      <span className={`size-1.5 rounded-full ${cfg.dot}`} />
      {cfg.label}
    </span>
  );
}

export default async function ApplicationsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const applications = await prisma.match.findMany({
    where: {
      trackedCompany: { userId: user.id },
      applicationStatus: { in: ACTIVE_STATUSES },
    },
    include: {
      job: { include: { company: true } },
    },
    orderBy: [
      { appliedAt: { sort: "desc", nulls: "last" } },
      { createdAt: "desc" },
    ],
  });

  // Group by status for summary counts
  const counts = ACTIVE_STATUSES.reduce<Record<string, number>>((acc, s) => {
    acc[s] = applications.filter((a) => a.applicationStatus === s).length;
    return acc;
  }, {});

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold">Applications</h1>
        <p className="text-sm text-muted-foreground mt-0.5">
          Everything you've applied to or are in process with
        </p>
      </div>

      {/* Summary pills */}
      {applications.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {ACTIVE_STATUSES.map((s) =>
            counts[s] > 0 ? (
              <span
                key={s}
                className="inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium"
              >
                <span className={`size-1.5 rounded-full ${STATUS_CONFIG[s as AppStatus].dot}`} />
                {counts[s]} {STATUS_CONFIG[s as AppStatus].label.toLowerCase()}
              </span>
            ) : null,
          )}
        </div>
      )}

      {applications.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 gap-3 text-center">
          <ClipboardList className="size-10 text-muted-foreground/40" />
          <p className="font-medium">No applications yet</p>
          <p className="text-sm text-muted-foreground max-w-xs">
            When you mark a matched job as Applied, Interviewing, or Offer, it'll appear here.
          </p>
          <Link
            href="/matches"
            className="text-sm text-primary hover:underline underline-offset-2 mt-1"
          >
            View your matches →
          </Link>
        </div>
      ) : (
        <div className="rounded-xl border overflow-hidden">
          {applications.map((app) => (
            <div
              key={app.id}
              className="flex items-center gap-4 px-4 py-3.5 border-b last:border-0 hover:bg-muted/30 transition-colors"
            >
              {/* Company + role */}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium leading-snug truncate">{app.job.title}</p>
                <Link
                  href={`/companies/${app.job.company.slug}`}
                  className="text-xs text-muted-foreground hover:underline underline-offset-2"
                >
                  {app.job.company.name}
                </Link>
                {app.applicationNote && (
                  <p className="text-xs text-muted-foreground/60 mt-0.5 italic truncate">
                    {app.applicationNote}
                  </p>
                )}
              </div>

              {/* Applied date */}
              <div className="text-xs text-muted-foreground w-20 shrink-0 text-right tabular-nums">
                {app.appliedAt
                  ? app.appliedAt.toLocaleDateString("en-US", {
                      month: "short",
                      day: "numeric",
                    })
                  : "—"}
              </div>

              {/* Status (interactive picker) */}
              <div className="shrink-0 w-36 flex justify-end">
                <StatusPicker
                  matchId={app.id}
                  initialStatus={app.applicationStatus as AppStatus}
                />
              </div>

              {/* External apply link */}
              {app.job.url && (
                <a
                  href={app.job.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="shrink-0 text-muted-foreground hover:text-foreground transition-colors"
                  title="Open application"
                >
                  <ExternalLink className="size-3.5" />
                </a>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
