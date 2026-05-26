"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Search, Users, Clock } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { CompanyLogo } from "@/components/company-logo";
import { FollowButton } from "@/components/follow-button";
import type { Sort } from "@/app/(browse)/companies/page";

type Company = {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  industry: string | null;
  headquarters: string | null;
  website: string | null;
  size: string | null;
  fundingStage: string | null;
  _count: { trackedBy: number };
  jobs: { postedAt: Date | null }[];
};

const SORT_OPTIONS: { value: Sort; label: string }[] = [
  { value: "active", label: "Active" },
  { value: "az",     label: "A–Z" },
  { value: "followed", label: "Most followed" },
];

function formatLastActive(date: Date | null | undefined): string | null {
  if (!date) return null;
  const now = Date.now();
  const diff = now - new Date(date).getTime();
  const days = Math.floor(diff / 86400000);
  if (days === 0) return "today";
  if (days === 1) return "yesterday";
  if (days < 7) return `${days}d ago`;
  if (days < 30) return `${Math.floor(days / 7)}w ago`;
  if (days < 365) return `${Math.floor(days / 30)}mo ago`;
  return `${Math.floor(days / 365)}y ago`;
}

function formatFundingStage(stage: string | null): string | null {
  if (!stage) return null;
  const map: Record<string, string> = {
    pre_seed: "Pre-seed",
    seed: "Seed",
    series_a: "Series A",
    series_b: "Series B",
    series_c: "Series C",
    growth: "Growth",
    public: "Public",
  };
  return map[stage] ?? stage;
}

export function CompanyBrowser({
  companies,
  trackedMap,
  industries,
  userId,
  initialQ,
  initialIndustry,
  initialSort,
}: {
  companies: Company[];
  trackedMap: Map<string, { id: string }>;
  industries: string[];
  userId: string | null;
  initialQ: string;
  initialIndustry: string;
  initialSort: Sort;
}) {
  const router = useRouter();
  const [q, setQ] = useState(initialQ);
  const [industry, setIndustry] = useState(initialIndustry);
  const [sort, setSort] = useState<Sort>(initialSort);
  const [, startTransition] = useTransition();

  function applyFilters(newQ: string, newIndustry: string, newSort: Sort) {
    const params = new URLSearchParams();
    if (newQ) params.set("q", newQ);
    if (newIndustry) params.set("industry", newIndustry);
    if (newSort !== "active") params.set("sort", newSort);
    startTransition(() => {
      router.push(`/companies?${params.toString()}`);
    });
  }

  return (
    <div className="space-y-5">
      <div className="space-y-3">
        {/* Search + sort row */}
        <div className="flex gap-2 flex-wrap">
          <div className="relative flex-1 min-w-48 max-w-sm">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground pointer-events-none" />
            <Input
              placeholder="Search companies…"
              className="pl-8"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && applyFilters(q, industry, sort)}
            />
          </div>
          <Button variant="outline" size="sm" onClick={() => applyFilters(q, industry, sort)}>
            Search
          </Button>
          <select
            value={sort}
            onChange={(e) => {
              const next = e.target.value as Sort;
              setSort(next);
              applyFilters(q, industry, next);
            }}
            className="h-9 rounded-md border border-input bg-background px-3 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
          >
            {SORT_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>

        {/* Industry pills */}
        {industries.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {["", ...industries].map((ind) => (
              <button
                key={ind || "__all__"}
                onClick={() => {
                  setIndustry(ind);
                  applyFilters(q, ind, sort);
                }}
                className={cn(
                  "rounded-full px-3 py-1 text-xs font-medium border transition-colors",
                  industry === ind
                    ? "border-foreground bg-foreground text-background"
                    : "border-border text-muted-foreground hover:border-foreground/30 hover:text-foreground",
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
  const lastActive = formatLastActive(company.jobs[0]?.postedAt);
  const fundingLabel = formatFundingStage(company.fundingStage);

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
          <div className="flex flex-wrap gap-x-2 gap-y-0.5">
            {company.industry && (
              <p className="text-xs text-muted-foreground">{company.industry}</p>
            )}
            {fundingLabel && (
              <p className="text-xs text-muted-foreground">{fundingLabel}</p>
            )}
          </div>
        </div>
      </div>

      {company.description && (
        <p className="text-xs text-muted-foreground leading-relaxed line-clamp-2">
          {company.description}
        </p>
      )}

      <div className="flex items-center justify-between mt-auto pt-1">
        <div className="flex items-center gap-3">
          {company._count.trackedBy > 0 && (
            <span className="flex items-center gap-1 text-xs text-muted-foreground">
              <Users className="size-3" />
              {company._count.trackedBy.toLocaleString()}
            </span>
          )}
          {lastActive && (
            <span className="flex items-center gap-1 text-xs text-muted-foreground">
              <Clock className="size-3" />
              {lastActive}
            </span>
          )}
        </div>
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
