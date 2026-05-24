"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Search, Users } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { CompanyLogo } from "@/components/company-logo";
import { FollowButton } from "@/components/follow-button";

type Company = {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  industry: string | null;
  headquarters: string | null;
  website: string | null;
  _count: { trackedBy: number };
};

export function CompanyBrowser({
  companies,
  trackedMap,
  industries,
  userId,
  initialQ,
  initialIndustry,
}: {
  companies: Company[];
  trackedMap: Map<string, { id: string }>;
  industries: string[];
  userId: string | null;
  initialQ: string;
  initialIndustry: string;
}) {
  const router = useRouter();
  const [q, setQ] = useState(initialQ);
  const [industry, setIndustry] = useState(initialIndustry);
  const [, startTransition] = useTransition();

  function applyFilters(newQ: string, newIndustry: string) {
    const params = new URLSearchParams();
    if (newQ) params.set("q", newQ);
    if (newIndustry) params.set("industry", newIndustry);
    startTransition(() => {
      router.push(`/companies?${params.toString()}`);
    });
  }

  return (
    <div className="space-y-5">
      <div className="space-y-3">
        <div className="flex gap-2 max-w-sm">
          <div className="relative flex-1">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground pointer-events-none" />
            <Input
              placeholder="Search companies…"
              className="pl-8"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && applyFilters(q, industry)}
            />
          </div>
          <Button variant="outline" size="sm" onClick={() => applyFilters(q, industry)}>
            Search
          </Button>
        </div>

        {industries.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {["", ...industries].map((ind) => (
              <button
                key={ind || "__all__"}
                onClick={() => {
                  const next = ind;
                  setIndustry(next);
                  applyFilters(q, next);
                }}
                className={cn(
                  "rounded-full px-3 py-1 text-xs font-medium border transition-colors",
                  industry === ind
                    ? "border-foreground bg-foreground text-background"
                    : "border-border text-muted-foreground hover:border-foreground/30 hover:text-foreground"
                )}
              >
                {ind || "All"}
              </button>
            ))}
          </div>
        )}
      </div>

      {companies.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 gap-2 text-center">
          <p className="text-sm text-muted-foreground">No companies found</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {companies.map((company) => {
            const tracked = trackedMap.get(company.id) ?? null;
            return (
              <CompanyCard
                key={company.id}
                company={company}
                tracked={tracked}
                userId={userId}
              />
            );
          })}
        </div>
      )}
    </div>
  );
}

function CompanyCard({
  company,
  tracked,
  userId,
}: {
  company: Company;
  tracked: { id: string } | null;
  userId: string | null;
}) {
  return (
    <div className="group relative flex flex-col gap-3 rounded-xl border bg-card p-4 transition-shadow hover:shadow-sm">
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
            className="font-semibold text-sm leading-snug hover:underline underline-offset-2"
          >
            {company.name}
          </a>
          {company.industry && (
            <p className="text-xs text-muted-foreground">{company.industry}</p>
          )}
        </div>
      </div>

      {company.description && (
        <p className="text-xs text-muted-foreground leading-relaxed line-clamp-2">
          {company.description}
        </p>
      )}

      <div className="flex items-center justify-between mt-auto pt-1">
        {company._count.trackedBy > 0 ? (
          <span className="flex items-center gap-1 text-xs text-muted-foreground">
            <Users className="size-3" />
            {company._count.trackedBy.toLocaleString()} following
          </span>
        ) : (
          <span />
        )}
        <FollowButton
          company={{ id: company.id, name: company.name }}
          tracked={tracked}
          userId={userId}
          size="sm"
        />
      </div>
    </div>
  );
}
