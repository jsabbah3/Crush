"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Search, Users, Briefcase, ChevronDown, Loader2 } from "lucide-react";
import { Input } from "@/components/ui/input";
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
  activeJobs: number;
  _count: { trackedBy: number };
  jobs: { postedAt: Date | null }[];
};

const SORT_OPTIONS: { value: Sort; label: string }[] = [
  { value: "active", label: "Most active" },
  { value: "az", label: "A–Z" },
  { value: "followed", label: "Most followed" },
];

const VISIBLE_INDUSTRIES = 12;
const INITIAL_VISIBLE = 24;
const REVEAL_STEP = 24;

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

function FilterPill({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      aria-pressed={active}
      className={cn(
        "cursor-pointer rounded-full px-3 py-1 text-xs font-medium border transition-colors duration-150",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/60",
        active
          ? "border-foreground bg-foreground text-background"
          : "border-border text-muted-foreground hover:border-foreground/30 hover:text-foreground hover:bg-accent",
      )}
    >
      {children}
    </button>
  );
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
  const [showAllIndustries, setShowAllIndustries] = useState(
    Boolean(initialIndustry && industries.indexOf(initialIndustry) >= VISIBLE_INDUSTRIES),
  );
  // Progressive reveal so a 100-card result isn't a 25,000px mobile scroll.
  const [visibleCount, setVisibleCount] = useState(INITIAL_VISIBLE);
  const [isPending, startTransition] = useTransition();
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const didMount = useRef(false);

  function navigate(newQ: string, newIndustry: string, newVc: string, newSort: Sort) {
    const params = new URLSearchParams();
    params.set("view", "browse"); // always preserve browse mode
    if (newQ) params.set("q", newQ);
    if (newIndustry) params.set("industry", newIndustry);
    if (newVc) params.set("vc", newVc);
    if (newSort !== "active") params.set("sort", newSort);
    startTransition(() => {
      router.replace(`/companies?${params.toString()}`, { scroll: false });
    });
  }

  // Instant search: debounce keystrokes instead of requiring a Search button
  useEffect(() => {
    if (!didMount.current) {
      didMount.current = true;
      return;
    }
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => navigate(q, industry, vc, sort), 300);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q]);

  // A fresh result set (new search/filter) collapses back to the first page.
  useEffect(() => {
    setVisibleCount(INITIAL_VISIBLE);
  }, [companies]);

  const visibleIndustries = showAllIndustries
    ? industries
    : industries.slice(0, VISIBLE_INDUSTRIES);
  const hiddenCount = industries.length - VISIBLE_INDUSTRIES;

  const visibleCompanies = companies.slice(0, visibleCount);
  const hasMore = companies.length > visibleCount;

  return (
    <div className="space-y-5">
      <div className="space-y-4">
        {/* Search + sort row */}
        <div className="flex gap-2 flex-wrap items-center">
          <div className="relative flex-1 min-w-48 max-w-sm">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground pointer-events-none" />
            <Input
              placeholder="Search companies…"
              className="pl-8 pr-8"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              aria-label="Search companies"
            />
            {isPending && (
              <Loader2 className="absolute right-2.5 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground animate-spin" />
            )}
          </div>
          <div
            role="radiogroup"
            aria-label="Sort companies"
            className="flex items-center rounded-lg border border-border bg-muted/40 p-0.5"
          >
            {SORT_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                role="radio"
                aria-checked={sort === opt.value}
                onClick={() => {
                  setSort(opt.value);
                  navigate(q, industry, vc, opt.value);
                }}
                className={cn(
                  "cursor-pointer rounded-md px-3 py-1.5 text-xs font-medium transition-colors duration-150",
                  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/60",
                  sort === opt.value
                    ? "bg-background text-foreground shadow-sm border border-border/60"
                    : "text-muted-foreground hover:text-foreground",
                )}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        {/* VC filter pills */}
        {vcs.length > 0 && (
          <div className="flex flex-col gap-1.5 sm:flex-row sm:items-baseline sm:gap-3">
            <p className="text-[11px] font-medium text-muted-foreground/70 uppercase tracking-wider sm:w-16 shrink-0 sm:pt-1.5">
              Backed by
            </p>
            <div className="flex flex-wrap gap-1.5">
              {["", ...vcs].map((v) => (
                <FilterPill
                  key={v || "__all__"}
                  active={vc === v}
                  onClick={() => {
                    setVc(v);
                    navigate(q, industry, v, sort);
                  }}
                >
                  {v || "All"}
                </FilterPill>
              ))}
            </div>
          </div>
        )}

        {/* Industry pills — top 12 by company count, rest behind "More" */}
        {industries.length > 0 && (
          <div className="flex flex-col gap-1.5 sm:flex-row sm:items-baseline sm:gap-3">
            <p className="text-[11px] font-medium text-muted-foreground/70 uppercase tracking-wider sm:w-16 shrink-0 sm:pt-1.5">
              Industry
            </p>
            <div className="flex flex-wrap gap-1.5">
              {["", ...visibleIndustries].map((ind) => (
                <FilterPill
                  key={ind || "__all__"}
                  active={industry === ind}
                  onClick={() => {
                    setIndustry(ind);
                    navigate(q, ind, vc, sort);
                  }}
                >
                  {ind || "All"}
                </FilterPill>
              ))}
              {hiddenCount > 0 && (
                <button
                  onClick={() => setShowAllIndustries((s) => !s)}
                  className="cursor-pointer inline-flex items-center gap-0.5 rounded-full px-3 py-1 text-xs font-medium text-muted-foreground hover:text-foreground transition-colors duration-150"
                  aria-expanded={showAllIndustries}
                >
                  {showAllIndustries ? "Less" : `+${hiddenCount} more`}
                  <ChevronDown
                    className={cn("size-3 transition-transform duration-150", showAllIndustries && "rotate-180")}
                  />
                </button>
              )}
            </div>
          </div>
        )}
      </div>

      {companies.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 gap-3 text-center rounded-xl border border-dashed border-border">
          <Search className="size-5 text-muted-foreground/50" />
          <div className="space-y-1">
            <p className="text-sm font-medium text-foreground">No companies match</p>
            <p className="text-xs text-muted-foreground">Try a different search or clear a filter.</p>
          </div>
          {(q || industry || vc) && (
            <button
              onClick={() => {
                setQ("");
                setIndustry("");
                setVc("");
                navigate("", "", "", sort);
              }}
              className="cursor-pointer text-xs font-medium text-primary hover:underline underline-offset-2"
            >
              Clear all filters
            </button>
          )}
        </div>
      ) : (
        <>
          <div
            className={cn(
              "grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 transition-opacity duration-150",
              isPending && "opacity-60",
            )}
          >
            {visibleCompanies.map((company) => {
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
          {hasMore && (
            <div className="flex flex-col items-center gap-2 pt-4">
              <button
                onClick={() => setVisibleCount((c) => c + REVEAL_STEP)}
                className="cursor-pointer rounded-lg border border-border bg-card px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/60"
              >
                Show more companies
              </button>
              <p className="font-mono text-[11px] text-muted-foreground tabular-nums">
                {visibleCompanies.length} of {companies.length}
              </p>
            </div>
          )}
        </>
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
    <div className="group relative flex flex-col gap-3 rounded-xl border border-border/60 bg-card p-4 transition-all duration-150 hover:border-border hover:shadow-sm">
      <div className="flex items-start gap-3">
        <CompanyLogo
          name={company.name}
          website={company.website}
          size="md"
          className="shrink-0"
        />
        <div className="flex-1 min-w-0 space-y-0.5">
          <div className="flex items-start gap-2 flex-wrap">
            <a
              href={`/companies/${company.slug}`}
              className="font-semibold text-[15px] leading-snug hover:underline underline-offset-2"
            >
              {company.name}
            </a>
            {recentlyFunded && (
              <span className="inline-flex items-center gap-1 rounded-full bg-moss-soft border border-moss/25 px-1.5 py-0.5 text-[10px] font-medium text-moss leading-none shrink-0 mt-0.5">
                <span className="h-1 w-1 rounded-full bg-moss" />
                {fundingLabel ?? "Recently funded"}
              </span>
            )}
          </div>
          <div className="flex flex-wrap items-center gap-x-1.5 text-xs text-muted-foreground">
            {company.industry && <span>{company.industry}</span>}
            {company.industry && fundingLabel && !recentlyFunded && <span aria-hidden>·</span>}
            {fundingLabel && !recentlyFunded && <span>{fundingLabel}</span>}
          </div>
        </div>
      </div>

      {company.description && (
        <p className="text-xs text-muted-foreground leading-relaxed line-clamp-2">
          {company.description}
        </p>
      )}

      <div className="flex items-center justify-between mt-auto pt-1">
        <div className="flex items-center gap-3 text-xs text-muted-foreground">
          {company.activeJobs > 0 && (
            <span className="flex items-center gap-1 font-medium text-foreground/80">
              <Briefcase className="size-3" />
              <span className="font-mono tabular-nums">{company.activeJobs}</span> open {company.activeJobs === 1 ? "role" : "roles"}
              {lastActive && <span className="font-normal text-muted-foreground">· {lastActive}</span>}
            </span>
          )}
          {company._count.trackedBy > 0 && (
            <span className="flex items-center gap-1 font-mono tabular-nums">
              <Users className="size-3" />
              {company._count.trackedBy.toLocaleString()}
            </span>
          )}
          {connectionCount > 0 && (
            <span className="flex items-center gap-1 font-medium text-slate-warm">
              <Users className="size-3" />
              {connectionCount} connection{connectionCount !== 1 ? "s" : ""}
            </span>
          )}
        </div>
        <FollowButton
          company={{ id: company.id, name: company.name }}
          tracked={tracked}
          userId={userId}
          size="sm"
          tone="quiet"
        />
      </div>
    </div>
  );
}
