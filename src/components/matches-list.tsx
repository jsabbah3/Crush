"use client";

import { useState } from "react";
import { JobCard } from "@/components/job-card";

type Company = { name: string; slug: string };

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

  // Collect unique company names in order of first appearance
  const companies: string[] = [];
  const seen = new Set<string>();
  for (const m of matches) {
    const name = m.job.company.name;
    if (!seen.has(name)) { seen.add(name); companies.push(name); }
  }

  const filtered = activeCompany
    ? matches.filter((m) => m.job.company.name === activeCompany)
    : matches;

  // Group filtered matches by company
  const byCompany = new Map<string, Match[]>();
  for (const m of filtered) {
    const name = m.job.company.name;
    if (!byCompany.has(name)) byCompany.set(name, []);
    byCompany.get(name)!.push(m);
  }

  return (
    <div className="space-y-6">
      {/* Company filter chips */}
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
          {companies.map((name) => (
            <button
              key={name}
              onClick={() => setActiveCompany(activeCompany === name ? null : name)}
              className={`rounded-full px-3 py-1 text-xs font-medium transition-colors border ${
                activeCompany === name
                  ? "bg-foreground text-background border-foreground"
                  : "bg-transparent text-muted-foreground border-border hover:border-foreground hover:text-foreground"
              }`}
            >
              {name}
            </button>
          ))}
        </div>
      )}

      {/* Matches grouped by company */}
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
    </div>
  );
}
