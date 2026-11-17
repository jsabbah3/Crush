"use client";

import { useState } from "react";
import Link from "next/link";
import { ChevronDown } from "lucide-react";
import { JobCard } from "@/components/job-card";
import type { AppStatus } from "@/components/status-picker";
import { CompanyLogo } from "@/components/company-logo";
import { FollowButton } from "@/components/follow-button";
import { Tag } from "@/components/brand";
import { Button } from "@/components/ui/button";
import { roleKey } from "@/lib/role-key";
import { cn } from "@/lib/utils";

export type GroupJob = {
  id: string;
  title: string;
  type: string;
  location: string | null;
  remote: boolean;
  salaryMin: number | null;
  salaryMax: number | null;
  currency: string;
  url: string | null;
  postedAt: Date | null;
  companyId: string;
  company: { name: string; slug: string; website: string | null };
};

/** One row: a match (has an id and status) or, in "Also open", just a job. */
export type GroupItem = {
  job: GroupJob;
  /** When it reached us — orders companies and roles. */
  at: Date;
  match?: { id: string; applicationStatus: string; seenAt: Date | null };
};

type Role = { lead: GroupItem; rest: GroupItem[]; isNew: boolean };
type Company = { id: string; company: GroupJob["company"]; roles: Role[]; newCount: number; latest: number };

const PAGE = 15;

function place(j: GroupJob) {
  if (j.remote && !j.location) return "Remote";
  return j.location ?? (j.remote ? "Remote" : "On-site");
}

function group(items: GroupItem[], sortByNews: boolean): Company[] {
  const byCompany = new Map<string, Company>();
  const byRole = new Map<string, Role>();
  for (const it of items) {
    const isNew = !!it.match && it.match.seenAt === null;
    let c = byCompany.get(it.job.companyId);
    if (!c) {
      c = { id: it.job.companyId, company: it.job.company, roles: [], newCount: 0, latest: 0 };
      byCompany.set(it.job.companyId, c);
    }
    c.latest = Math.max(c.latest, new Date(it.at).getTime());
    // Same role posted for several locations folds into one card.
    const k = roleKey(it.job.companyId, it.job.title);
    const r = byRole.get(k);
    if (r) {
      r.rest.push(it);
      r.isNew ||= isNew;
    } else {
      const role = { lead: it, rest: [], isNew };
      byRole.set(k, role);
      c.roles.push(role);
    }
  }
  for (const c of byCompany.values()) c.newCount = c.roles.filter((r) => r.isNew).length;
  // Matches: companies with something new first, then most recent.
  // Also open: keep the caller's order (similar companies first).
  if (!sortByNews) return [...byCompany.values()];
  return [...byCompany.values()].sort((a, b) => Number(b.newCount > 0) - Number(a.newCount > 0) || b.latest - a.latest);
}

/**
 * Roles grouped under their company, each company collapsible. Used for your
 * matches (with status and dismiss on each card) and for "Also open" (jobs at
 * companies not on your list, with a follow button on each company).
 */
export function CompanyGroups({
  items,
  mode,
  networkByCompanyId = {},
  userId,
}: {
  items: GroupItem[];
  mode: "matches" | "also";
  networkByCompanyId?: Record<string, number>;
  userId: string;
}) {
  const companies = group(items, mode === "matches");
  const [shown, setShown] = useState(PAGE);
  // Open by default: anything with news, plus the first few.
  const [open, setOpen] = useState<Set<string>>(
    () => new Set(companies.filter((c, i) => c.newCount > 0 || i < 3).map((c) => c.id)),
  );
  const toggle = (id: string) =>
    setOpen((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  const allOpen = companies.slice(0, shown).every((c) => open.has(c.id));

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <button
          type="button"
          onClick={() => setOpen(allOpen ? new Set() : new Set(companies.slice(0, shown).map((c) => c.id)))}
          className="cursor-pointer text-xs font-semibold text-muted-foreground hover:text-foreground"
        >
          {allOpen ? "Collapse all" : "Expand all"}
        </button>
      </div>

      <div className="border-t border-foreground">
        {companies.slice(0, shown).map((c) => {
          const isOpen = open.has(c.id);
          return (
            <section key={c.id} className="border-b border-foreground/15">
              <div className="flex items-center gap-3 py-3">
                <button
                  type="button"
                  onClick={() => toggle(c.id)}
                  aria-expanded={isOpen}
                  className="group flex min-w-0 flex-1 cursor-pointer items-center gap-3 text-left"
                >
                  <ChevronDown
                    className={cn("size-4 shrink-0 text-muted-foreground transition-transform", !isOpen && "-rotate-90")}
                  />
                  <CompanyLogo name={c.company.name} website={c.company.website} size="sm" />
                  <span className="truncate font-heading text-xl font-bold tracking-[-0.02em] group-hover:text-primary">
                    {c.company.name}
                  </span>
                  <span className="shrink-0 font-mono text-xs text-muted-foreground">
                    {c.roles.length} {c.roles.length === 1 ? "role" : "roles"}
                  </span>
                  {c.newCount > 0 && <Tag solid className="shrink-0 text-[0.6rem]">{c.newCount} new</Tag>}
                </button>
                {mode === "also" ? (
                  <FollowButton company={{ id: c.id, name: c.company.name }} tracked={null} userId={userId} tone="quiet" />
                ) : (
                  <Link
                    href={`/companies/${c.company.slug}`}
                    className="hidden shrink-0 text-xs font-semibold text-muted-foreground hover:text-foreground sm:block"
                  >
                    Company page →
                  </Link>
                )}
              </div>

              {isOpen && (
                <div className="space-y-3 pb-4 pl-0 sm:pl-7">
                  {c.roles.map(({ lead, rest, isNew }) => (
                    <JobCard
                      key={lead.job.id}
                      job={lead.job}
                      hideCompany
                      matchId={lead.match?.id}
                      applicationStatus={lead.match?.applicationStatus as AppStatus | undefined}
                      networkCount={networkByCompanyId[c.id]}
                      isNew={isNew}
                      siblingIds={rest.flatMap((r) => (r.match ? [r.match.id] : []))}
                      alsoIn={[...new Set(rest.map((r) => place(r.job)))].filter((p) => p !== place(lead.job))}
                    />
                  ))}
                </div>
              )}
            </section>
          );
        })}
      </div>

      {companies.length > shown && (
        <div className="flex items-center gap-4">
          <Button variant="outline" onClick={() => setShown((n) => n + PAGE)}>
            Show {Math.min(PAGE, companies.length - shown)} more companies
          </Button>
          <span className="font-mono text-xs text-muted-foreground">
            {shown} of {companies.length}
          </span>
        </div>
      )}
    </div>
  );
}
