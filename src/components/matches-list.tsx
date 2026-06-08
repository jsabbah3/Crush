"use client";

import { useState } from "react";
import { JobCard } from "@/components/job-card";
import { type AppStatus } from "@/components/status-picker";
import { CompanyLogo } from "@/components/company-logo";
import Link from "next/link";

type Company = { name: string; slug: string; website?: string | null };

type Match = {
  id: string;
  applicationStatus: string | null;
  job: {
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
    company: Company;
  };
};

type Props = {
  matches: Match[];
};

export function MatchesList({ matches }: Props) {
  const [activeCompany, setActiveCompany] = useState<string | null>(null);
  // Collect unique companies
  const companies: Company[] = [];
  const seenSlugs = new Set<string>();
  for (const m of matches) {
    if (!seenSlugs.has(m.job.company.slug)) {
      seenSlugs.add(m.job.company.slug);
      companies.push(m.job.company);
    }
  }

  const filtered = activeCompany
    ? matches.filter((m) => m.job.company.name !== activeCompany ? false : true)
    : matches;

  // Group by company
  const byCompany = new Map<string, Match[]>();
  for (const m of filtered) {
    const name = m.job.company.name;
    if (!byCompany.has(name)) byCompany.set(name, []);
    byCompany.get(name)!.push(m);
  }

  return (
    <div className="space-y-6">


      {/* Company filter pills */}
      {companies.length > 1 && (
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => setActiveCompany(null)}
            className={`rounded-full px-3 py-1 text-xs font-medium transition-colors border ${
              activeCompany === null
                ? "bg-foreground text-background border-foreground"
                : "bg-transparent text-muted-foreground border-border hover:border-foreground hover:text-foreground"
            }`}
          >
            All
          </button>
          {companies.map((company) => (
            <button
              key={company.slug}
              onClick={() => setActiveCompany(activeCompany === company.name ? null : company.name)}
              className={`flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium transition-colors border ${
                activeCompany === company.name
                  ? "bg-foreground text-background border-foreground"
                  : "bg-transparent text-muted-foreground border-border hover:border-foreground hover:text-foreground"
              }`}
            >
              {company.website && (
                <CompanyLogo name={company.name} website={company.website} size="sm" className="size-4 rounded-sm" />
              )}
              {company.name}
            </button>
          ))}
        </div>
      )}

      {/* Matches grouped by company */}
      {filtered.length === 0 ? (
        <p className="text-sm text-muted-foreground py-8 text-center">No matches in this filter.</p>
      ) : (
        <div className="space-y-8">
          {Array.from(byCompany.entries()).map(([companyName, companyMatches]) => {
            const company = companyMatches[0].job.company;
            return (
              <section key={companyName} className="space-y-2">
                <div className="flex items-center gap-2">
                  {company.website && (
                    <CompanyLogo name={company.name} website={company.website} size="sm" className="size-5 rounded-md" />
                  )}
                  <Link
                    href={`/companies/${company.slug}`}
                    className="text-sm font-semibold hover:underline underline-offset-2"
                  >
                    {companyName}
                  </Link>
                  <span className="text-xs text-muted-foreground">
                    {companyMatches.length} {companyMatches.length === 1 ? "role" : "roles"}
                  </span>
                </div>
                {companyMatches.map((match) => (
                  <JobCard
                    key={match.id}
                    job={match.job}
                    matchId={match.id}
                    applicationStatus={match.applicationStatus ?? "INTERESTED"}
                  />
                ))}
              </section>
            );
          })}
        </div>
      )}
    </div>
  );
}
