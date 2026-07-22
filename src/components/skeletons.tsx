import { Skeleton } from "@/components/ui/skeleton";

/**
 * Route loading skeletons. Each mirrors the real page's structure closely
 * enough that content lands with (near) zero layout shift.
 */

function PageTitleSkeleton({ withSub = true }: { withSub?: boolean }) {
  return (
    <div className="space-y-2">
      <Skeleton className="h-8 w-48" />
      {withSub && <Skeleton className="h-4 w-72" />}
    </div>
  );
}

function JobRowSkeleton() {
  return (
    <div className="rounded-lg border border-border/60 bg-card px-4 py-3.5">
      <div className="flex items-start gap-3">
        <Skeleton className="size-8 rounded-lg" />
        <div className="flex-1 space-y-2">
          <Skeleton className="h-3 w-24" />
          <Skeleton className="h-4 w-2/3" />
          <Skeleton className="h-3 w-1/2" />
        </div>
      </div>
    </div>
  );
}

function CompanyCardSkeleton() {
  return (
    <div className="flex flex-col gap-3 rounded-xl border border-border/60 bg-card p-4">
      <div className="flex items-start gap-3">
        <Skeleton className="size-12 rounded-xl" />
        <div className="flex-1 space-y-2 pt-1">
          <Skeleton className="h-4 w-2/3" />
          <Skeleton className="h-3 w-1/2" />
        </div>
      </div>
      <Skeleton className="h-3 w-full" />
      <Skeleton className="h-3 w-4/5" />
      <div className="flex items-center justify-between pt-1">
        <Skeleton className="h-3 w-20" />
        <Skeleton className="h-7 w-24 rounded-md" />
      </div>
    </div>
  );
}

export function DashboardSkeleton() {
  return (
    <div className="space-y-8">
      <PageTitleSkeleton />
      <div className="grid grid-cols-3 gap-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="rounded-xl border border-border/60 bg-card px-4 py-3 space-y-2">
            <Skeleton className="h-7 w-12" />
            <Skeleton className="h-3 w-20" />
          </div>
        ))}
      </div>
      <div className="space-y-4">
        <Skeleton className="h-5 w-32" />
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <JobRowSkeleton key={i} />
          ))}
        </div>
      </div>
    </div>
  );
}

export function MatchesSkeleton() {
  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <PageTitleSkeleton />
        <Skeleton className="h-4 w-16" />
      </div>
      <div className="flex gap-2">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-7 w-24 rounded-full" />
        ))}
      </div>
      <div className="space-y-8">
        {Array.from({ length: 2 }).map((_, s) => (
          <div key={s} className="space-y-2">
            <Skeleton className="h-4 w-40" />
            {Array.from({ length: 2 }).map((_, i) => (
              <JobRowSkeleton key={i} />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

export function CompaniesSkeleton() {
  return (
    <div className="space-y-6">
      <PageTitleSkeleton />
      <div className="flex flex-wrap gap-2">
        {Array.from({ length: 8 }).map((_, i) => (
          <Skeleton key={i} className="h-6 w-20 rounded-full" />
        ))}
      </div>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 9 }).map((_, i) => (
          <CompanyCardSkeleton key={i} />
        ))}
      </div>
    </div>
  );
}

export function CompanyDetailSkeleton() {
  return (
    <div className="space-y-8 max-w-2xl">
      <div className="flex items-start gap-4">
        <Skeleton className="size-16 rounded-2xl" />
        <div className="flex-1 space-y-2">
          <Skeleton className="h-7 w-40" />
          <Skeleton className="h-4 w-64" />
          <Skeleton className="h-3 w-32" />
        </div>
        <Skeleton className="h-8 w-24 rounded-md" />
      </div>
      <Skeleton className="h-4 w-full" />
      <div className="space-y-3">
        <Skeleton className="h-5 w-28" />
        {Array.from({ length: 5 }).map((_, i) => (
          <JobRowSkeleton key={i} />
        ))}
      </div>
    </div>
  );
}

export function CollectionsSkeleton() {
  return (
    <div className="space-y-6">
      <PageTitleSkeleton />
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="rounded-xl border border-border/60 bg-card p-5 space-y-4">
            <Skeleton className="h-8 w-28" />
            <div className="space-y-2">
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-3 w-full" />
              <Skeleton className="h-3 w-4/5" />
            </div>
            <Skeleton className="h-3 w-20" />
          </div>
        ))}
      </div>
    </div>
  );
}

export function BlogSkeleton() {
  return (
    <div className="max-w-2xl mx-auto space-y-10 py-4">
      <div className="space-y-2">
        <Skeleton className="h-8 w-56" />
        <Skeleton className="h-4 w-80" />
      </div>
      {Array.from({ length: 5 }).map((_, i) => (
        <div key={i} className="space-y-2.5">
          <Skeleton className="h-3 w-20" />
          <Skeleton className="h-6 w-3/4" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-2/3" />
        </div>
      ))}
    </div>
  );
}

export function ArticleSkeleton() {
  return (
    <article className="max-w-2xl mx-auto py-12 space-y-6">
      <Skeleton className="h-3 w-24" />
      <Skeleton className="h-9 w-4/5" />
      <div className="space-y-3 pt-4">
        {Array.from({ length: 8 }).map((_, i) => (
          <Skeleton key={i} className={`h-4 ${i % 3 === 2 ? "w-2/3" : "w-full"}`} />
        ))}
      </div>
    </article>
  );
}

export function SettingsSkeleton() {
  return (
    <div className="space-y-6 max-w-lg">
      <Skeleton className="h-8 w-32" />
      {Array.from({ length: 4 }).map((_, i) => (
        <div key={i} className="rounded-xl border border-border/60 bg-card p-6 space-y-4">
          <Skeleton className="h-5 w-32" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-2/3" />
        </div>
      ))}
    </div>
  );
}

export function WatchlistSkeleton() {
  return (
    <div className="space-y-8">
      <div className="space-y-2">
        <Skeleton className="h-3 w-20" />
        <Skeleton className="h-9 w-64" />
        <Skeleton className="h-4 w-48" />
      </div>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="rounded-xl border border-border/60 bg-card p-6 space-y-4">
            <Skeleton className="size-10 rounded-xl" />
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-3 w-20" />
          </div>
        ))}
      </div>
    </div>
  );
}
