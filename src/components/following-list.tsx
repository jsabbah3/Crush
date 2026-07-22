"use client";

import { Clock } from "lucide-react";
import { CompanyLogo } from "@/components/company-logo";
import { FollowButton } from "@/components/follow-button";

type TrackedWithCompany = {
  id: string;
  companyId: string;
  company: {
    id: string;
    name: string;
    slug: string;
    description: string | null;
    website: string | null;
    industry: string | null;
    _count: { trackedBy: number };
    jobs: { postedAt: Date | null }[];
  };
  _count: { matches: number };
};

function formatLastActive(date: Date | null | undefined): string | null {
  if (!date) return null;
  const now = Date.now();
  const diff = now - new Date(date).getTime();
  const days = Math.floor(diff / 86400000);
  if (days === 0) return "active today";
  if (days === 1) return "active yesterday";
  if (days < 7) return `active ${days}d ago`;
  if (days < 30) return `active ${Math.floor(days / 7)}w ago`;
  if (days < 365) return `active ${Math.floor(days / 30)}mo ago`;
  return `active ${Math.floor(days / 365)}y ago`;
}

export function FollowingList({
  tracked,
  userId,
  connectionCounts = {},
}: {
  tracked: TrackedWithCompany[];
  userId: string;
  connectionCounts?: Record<string, number>;
}) {
  if (tracked.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-3 text-center">
        <p className="font-medium">No companies followed yet</p>
        <p className="text-sm text-muted-foreground">
          Click &ldquo;Discover companies&rdquo; to find companies you&apos;d want to work at.
        </p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
      {tracked.map(({ id: trackedId, company, _count }) => {
        const lastActive = formatLastActive(company.jobs[0]?.postedAt);
        const connections = connectionCounts[company.id] ?? 0;
        return (
          <div
            key={trackedId}
            className="group relative flex flex-col gap-3 rounded-xl border border-border/60 bg-card p-5 transition-[border-color,box-shadow,transform] duration-[var(--dur-fast)] ease-[var(--ease-settle)] hover:border-border hover:shadow-sm hover:-translate-y-0.5"
          >
            <div className="flex items-start gap-3">
              <CompanyLogo
                name={company.name}
                website={company.website}
                size="md"
                className="shrink-0"
              />
              <div className="flex-1 min-w-0 space-y-0.5">
                <a
                  href={`/companies/${company.slug}`}
                  className="font-semibold text-sm leading-snug hover:text-primary transition-colors rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/60"
                >
                  {company.name}
                </a>
                {company.industry && (
                  <p className="text-xs text-muted-foreground">{company.industry}</p>
                )}
              </div>
              {_count.matches > 0 && (
                <span className="shrink-0 rounded-full bg-amber text-amber-foreground font-mono text-xs font-semibold px-2 py-0.5 tabular-nums">
                  {_count.matches} new
                </span>
              )}
            </div>

            {company.description && (
              <p className="text-xs text-muted-foreground leading-relaxed line-clamp-2">
                {company.description}
              </p>
            )}

            <div className="flex items-center justify-between mt-auto pt-1">
              <div className="flex items-center gap-3">
                {lastActive ? (
                  <span className="flex items-center gap-1 text-xs text-muted-foreground">
                    <Clock className="size-3" />
                    {lastActive}
                  </span>
                ) : (
                  <span className="text-xs text-muted-foreground">No open roles</span>
                )}
                {connections > 0 && (
                  <span className="flex items-center gap-1 font-mono text-xs font-medium text-slate-warm tabular-nums">
                    <svg className="size-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                      <circle cx="9" cy="7" r="4" />
                      <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
                      <path d="M16 3.13a4 4 0 0 1 0 7.75" />
                    </svg>
                    {connections}
                  </span>
                )}
              </div>
              <FollowButton
                company={{ id: company.id, name: company.name }}
                tracked={{ id: trackedId }}
                userId={userId}
                size="sm"
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}
