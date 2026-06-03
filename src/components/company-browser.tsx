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
  recentlyFundedAt: Date | null;
  _count: { trackedBy: number };
  jobs: { postedAt: Date | null }[];
};

const SORT_OPTIONS: { value: Sort; label: string }[] = [
  { value: "active", label: "Most active" },
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
  vcs,
  userId,
  initialQ,
  initialIndustry,
  initialVc,
  initialSort,
  connectionCounts = {},
}: {
  companies: Company[];
  trackedMap: Map<string, { id: string }>;
  industries: string[];
  vcs: string[];
  userId: string | null;
  initialQ: string;
  initialIndustry: string;
  initialVc: string;
  initialSort: Sort;
  connectionCounts?: Record<string, number>;
}) {
  const router = useRouter();
  const [q, setQ] = useState(initialQ);
  const [industry, setIndustry] = useState(initialIndustry);
  const [vc, setVc] = useState(initialVc);
  const [sort, setSort] = useState<Sort>(initialSort);
  const [, startTransition] = useTransition();

  function applyFilters(newQ: string, newIndustry: string, newVc: string, newSort: Sort) {
    const params = new URLSearchParams();
    params.set("view", "browse"); // always preserve browse mode
    if (newQ) params.set("q", newQ);
    if (newIndustry) params.set("industry", newIndustry);
    if (newVc) params.set("vc", newVc);
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
              onKeyDown={(e) => e.key === "Enter" && applyFilters(q, industry, vc, sort)}
            />
          </div>
          <Button variant="outline" size="sm" onClick={() => applyFilters(q, industry, vc, sort)}>
            Search
          </Button>
          <select
            value={sort}
            onChange={(e) => {
              const next = e.target.value as Sort;
              setSort(next);
              applyFilters(q, industry, vc, next);
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

        {/* VC filter pills */}
        {vcs.length > 0 && (
          <div className="space-y-1.5">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Backed by</p>
            <div className="flex flex-wrap gap-1.5">
              {["", ...vcs].map((v) => (
                <button
                  key={v || "__all__"}
                  onClick={() => {
                    setVc(v);
                    applyFilters(q, industry, v, sort);
                  }}
                  className={cn(
                    "rounded-full px-3 py-1 text-xs font-medium border transition-colors",
                    vc === v
                      ? "border-foreground bg-foreground text-background"
                      : "border-border text-muted-foreground hover:border-foreground/30 hover:text-foreground",
                  )}
                >
                  {v || "All"}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Industry pills */}
        {industries.length > 0 && (
          <div className="space-y-1.5">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Industry</p>
            <div className="flex flex-wrap gap-1.5">
              {["", ...industries].map((ind) => (
                <button
                  key={ind || "__all__"}
                  onClick={() => {
                    setIndustry(ind);
                    applyFilters(q, ind, vc, sort);
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
            const connections = connectionCounts[company.id] ?? 0;
            return (
              <CompanyCard
                key={company.id}
                company={company}
                tracked={tracked}
                userId={userId}
                connectionCount={connections}
              />
            );
          })}
        </div>
      )}
    </div>
  );
}

const NINETY_DAYS_MS = 90 * 24 * 60 * 60 * 1000;

function isRecentlyFunded(date: Date | null): boolean {
  if (!date) return false;
  return Date.now() - new Date(date).getTime() < NINETY_DAYS_MS;
}

function CompanyCard({
  company,
  tracked,
  userId,
  connectionCount = 0,
}: {
  company: Company;
  tracked: { id: string } | null;
  userId: string | null;
  connectionCount?: number;
}) {
  const lastActive = formatLastActive(company.jobs[0]?.postedAt);
  const fundingLabel = formatFundingStage(company.fundingStage);
  const recentlyFunded = isRecentlyFunded(company.recentlyFundedAt);

  return (
    <div className="group relative flex flex-col gap-3 rounded-xl border border-border/60 bg-card p-5 transition-all hover:border-border hover:shadow-sm">
      <div className="flex items-start gap-4">
        <CompanyLogo
          name={company.name}
          website={company.website}
          size="lg"
          className="shrink-0"
        />
        <div className="flex-1 min-w-0 space-y-1">
          <div className="flex items-start gap-2 flex-wrap">
            <a
              href={`/companies/${company.slug}`}
              className="font-semibold text-base leading-snug hover:underline underline-offset-2"
            >
              {company.name}
            </a>
            {recentlyFunded && (
              <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 px-1.5 py-0.5 text-[10px] font-medium text-emerald-700 dark:text-emerald-400 leading-none shrink-0 mt-0.5">
                <span className="h-1 w-1 rounded-full bg-emerald-500" />
                {fundingLabel ?? "Recently funded"}
              </span>
            )}
          </div>
          <div className="flex flex-wrap gap-x-2 gap-y-0.5">
            {company.industry && (
              <p className="text-xs text-muted-foreground">{company.industry}</p>
            )}
            {fundingLabel && !recentlyFunded && (
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
          {connectionCount > 0 && (
            <span className="flex items-center gap-1 text-xs font-medium text-blue-600 dark:text-blue-400">
              <svg className="size-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                <circle cx="9" cy="7" r="4" />
                <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
                <path d="M16 3.13a4 4 0 0 1 0 7.75" />
              </svg>
              {connectionCount} connection{connectionCount !== 1 ? "s" : ""}
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
