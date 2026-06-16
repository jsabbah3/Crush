"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { ChevronLeft, ChevronRight, ChevronDown } from "lucide-react";
import { CompanyLogo } from "@/components/company-logo";

type Job = {
  id: string;
  title: string;
  remote: boolean;
  location: string | null;
  url: string | null;
  postedAt: string | null;
  company: { name: string; slug: string; website: string | null };
};

export function DiscoverySection() {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(false);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(true);

  useEffect(() => {
    const saved = localStorage.getItem("crush:section:also-open");
    if (saved !== null) setOpen(saved === "true");
  }, []);

  function toggle() {
    setOpen((v) => {
      const next = !v;
      localStorage.setItem("crush:section:also-open", String(next));
      return next;
    });
  }

  const fetch = useCallback(async (p: number) => {
    setLoading(true);
    try {
      const res = await window.fetch(`/api/discovery?page=${p}`);
      const data = await res.json();
      setJobs(data.jobs ?? []);
      setHasMore(data.hasMore ?? false);
      setTotal(data.total ?? 0);
      setPage(p);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetch(0); }, [fetch]);

  if (!loading && jobs.length === 0) return null;

  const pageCount = Math.ceil(total / 5);

  return (
    <section className="space-y-3">
      <div className="flex items-center justify-between">
        <button onClick={toggle} className="flex items-start gap-2 group text-left" aria-expanded={open}>
          <ChevronDown className={`size-4 mt-1 text-muted-foreground transition-transform duration-200 ${open ? "" : "-rotate-90"}`} />
          <div>
            <h2 className="font-heading text-lg font-bold tracking-tight group-hover:text-foreground/80 transition-colors">Also open right now</h2>
            <p className="text-sm text-muted-foreground mt-0.5">
              Roles matching yours at companies you haven&apos;t followed yet.
            </p>
          </div>
        </button>
        {open && pageCount > 1 && (
          <div className="flex items-center gap-1">
            <button
              onClick={() => fetch(page - 1)}
              disabled={page === 0 || loading}
              className="flex items-center justify-center size-7 rounded-md border border-border/60 hover:border-border disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
            >
              <ChevronLeft className="size-3.5" />
            </button>
            <span className="text-xs text-muted-foreground px-1 tabular-nums">
              {page + 1} / {pageCount}
            </span>
            <button
              onClick={() => fetch(page + 1)}
              disabled={!hasMore || loading}
              className="flex items-center justify-center size-7 rounded-md border border-border/60 hover:border-border disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
            >
              <ChevronRight className="size-3.5" />
            </button>
          </div>
        )}
      </div>

      {open && <div className={`space-y-2 transition-opacity duration-150 ${loading ? "opacity-40" : "opacity-100"}`}>
        {jobs.map((job) => (
          <div key={job.id} className="rounded-xl border border-dashed border-border bg-card hover:border-border/80 transition-colors">
            <div className="flex items-start gap-4 p-4">
              <Link href={`/companies/${job.company.slug}`} className="shrink-0 mt-0.5">
                <CompanyLogo name={job.company.name} website={job.company.website} size="md" />
              </Link>
              <div className="flex-1 min-w-0">
                <Link
                  href={`/companies/${job.company.slug}`}
                  className="text-[11px] font-medium tracking-wide text-muted-foreground uppercase hover:text-foreground transition-colors"
                >
                  {job.company.name}
                </Link>
                <p className="font-semibold text-[15px] leading-snug text-foreground mt-0.5">{job.title}</p>
                <div className="flex items-center gap-2 mt-2">
                  <span className={`text-[11px] font-medium px-2 py-0.5 rounded-full ${job.remote ? "bg-emerald-50 text-emerald-700" : "bg-muted text-muted-foreground"}`}>
                    {job.remote ? "Remote" : (job.location ?? "On-site")}
                  </span>
                  {job.url && (
                    <a href={job.url} target="_blank" rel="noopener noreferrer"
                      className="text-[11px] font-semibold text-foreground hover:text-muted-foreground transition-colors">
                      Apply →
                    </a>
                  )}
                </div>
              </div>
            </div>
            <div className="border-t border-dashed px-4 py-2 flex items-center justify-end">
              <Link href={`/companies/${job.company.slug}`}
                className="text-[11px] font-medium text-primary hover:underline underline-offset-2 transition-colors">
                Follow {job.company.name} to get alerts →
              </Link>
            </div>
          </div>
        ))}
      </div>}
    </section>
  );
}
