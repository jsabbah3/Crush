"use client";

import { useState } from "react";
import { JobCard } from "@/components/job-card";
import type { AppStatus } from "@/components/status-picker";
import { Button } from "@/components/ui/button";
import { roleKey } from "@/lib/role-key";

export type InboxMatch = {
  id: string;
  createdAt: Date;
  seenAt: Date | null;
  applicationStatus: string;
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
    companyId: string;
    company: { name: string; slug: string; website: string | null };
  };
};

type Group = { lead: InboxMatch; rest: InboxMatch[]; isNew: boolean };

const PAGE = 25;

function place(m: InboxMatch) {
  if (m.job.remote && !m.job.location) return "Remote";
  return m.job.location ?? (m.job.remote ? "Remote" : "On-site");
}

function bucket(d: Date, now: number) {
  const days = (now - new Date(d).getTime()) / 86_400_000;
  if (days < 1) return "Today";
  if (days < 7) return "This week";
  return "Earlier";
}

/**
 * The inbox: every open match, newest first, with duplicate postings of one
 * role folded into a single card and the list split by when it opened.
 */
export function Inbox({
  matches,
  networkByCompanyId,
  now,
}: {
  matches: InboxMatch[];
  networkByCompanyId: Record<string, number>;
  /** Server render time, so buckets don't shift between server and client. */
  now: number;
}) {
  const [shown, setShown] = useState(PAGE);

  const byKey = new Map<string, Group>();
  for (const m of matches) {
    const k = roleKey(m.job.companyId, m.job.title);
    const g = byKey.get(k);
    if (g) {
      g.rest.push(m);
      if (!m.seenAt) g.isNew = true;
    } else {
      byKey.set(k, { lead: m, rest: [], isNew: !m.seenAt });
    }
  }
  const groups = [...byKey.values()];
  const visible = groups.slice(0, shown);

  const sections: { label: string; groups: Group[] }[] = [];
  for (const g of visible) {
    const label = bucket(g.lead.createdAt, now);
    const last = sections[sections.length - 1];
    if (last?.label === label) last.groups.push(g);
    else sections.push({ label, groups: [g] });
  }

  return (
    <div className="space-y-8">
      {sections.map((s) => (
        <section key={s.label} className="space-y-3">
          <h2 className="flex items-baseline gap-3 border-b border-foreground pb-2">
            <span className="label-caps text-graphite">{s.label}</span>
            <span className="font-mono text-xs text-muted-foreground">{s.groups.length}</span>
          </h2>
          <div className="space-y-3">
            {s.groups.map(({ lead, rest, isNew }) => (
              <JobCard
                key={lead.id}
                job={lead.job}
                matchId={lead.id}
                applicationStatus={lead.applicationStatus as AppStatus}
                networkCount={networkByCompanyId[lead.job.companyId]}
                isNew={isNew}
                siblingIds={rest.map((r) => r.id)}
                alsoIn={[...new Set(rest.map(place))].filter((p) => p !== place(lead))}
              />
            ))}
          </div>
        </section>
      ))}

      {groups.length > shown && (
        <div className="flex items-center gap-4">
          <Button variant="outline" onClick={() => setShown((n) => n + PAGE)}>
            Show {Math.min(PAGE, groups.length - shown)} more
          </Button>
          <span className="font-mono text-xs text-muted-foreground">
            {shown} of {groups.length}
          </span>
        </div>
      )}
    </div>
  );
}
