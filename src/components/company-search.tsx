"use client";

import { useState, useRef, useEffect, useTransition } from "react";
import { Search, Plus, Check, Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { followCompany } from "@/app/actions/tracking";
import { CompanyLogo } from "@/components/company-logo";

type Result = {
  id: string;
  name: string;
  slug: string;
  website: string | null;
  industry: string | null;
};

export function CompanySearch({
  trackedCompanyIds,
}: {
  trackedCompanyIds: string[];
}) {
  const router = useRouter();
  const [q, setQ] = useState("");
  const [results, setResults] = useState<Result[]>([]);
  const [open, setOpen] = useState(false);
  const [fetching, setFetching] = useState(false);
  const [followed, setFollowed] = useState<Set<string>>(new Set());
  const [isPending, startTransition] = useTransition();
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const trackedSet = new Set([...trackedCompanyIds, ...followed]);

  useEffect(() => {
    if (!q.trim()) {
      setResults([]);
      setOpen(false);
      return;
    }
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(async () => {
      setFetching(true);
      try {
        const res = await fetch(`/api/companies?q=${encodeURIComponent(q)}`);
        const data = await res.json() as Result[];
        setResults(data.slice(0, 8));
        setOpen(true);
      } finally {
        setFetching(false);
      }
    }, 250);
  }, [q]);

  // Close on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  function handleFollow(company: Result) {
    setFollowed((prev) => new Set([...prev, company.id]));
    startTransition(async () => {
      await followCompany(company.id);
      router.refresh();
    });
  }

  return (
    <div ref={containerRef} className="relative w-full max-w-md">
      <div className="relative">
        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground pointer-events-none" />
        {fetching && (
          <Loader2 className="absolute right-2.5 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground animate-spin" />
        )}
        <input
          ref={inputRef}
          type="text"
          placeholder="Search companies to follow…"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          onFocus={() => results.length > 0 && setOpen(true)}
          className="w-full h-9 pl-8 pr-8 rounded-md border border-input bg-background text-sm focus:outline-none focus:ring-1 focus:ring-ring"
        />
      </div>

      {open && results.length > 0 && (
        <div className="absolute top-full mt-1.5 left-0 min-w-[360px] w-full z-50 rounded-xl border border-border/60 bg-popover shadow-lg overflow-hidden">
          {results.map((company, i) => {
            const isTracked = trackedSet.has(company.id);
            return (
              <div
                key={company.id}
                className={[
                  "flex items-center gap-3.5 px-4 py-3.5 hover:bg-muted/50 transition-colors",
                  i > 0 ? "border-t border-border/40" : "",
                ].join(" ")}
              >
                <CompanyLogo name={company.name} website={company.website} size="md" className="shrink-0 size-9 rounded-lg" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold truncate">{company.name}</p>
                  {company.industry && (
                    <p className="text-xs text-muted-foreground truncate mt-0.5">{company.industry}</p>
                  )}
                </div>
                <button
                  onClick={() => !isTracked && handleFollow(company)}
                  disabled={isTracked || isPending}
                  className={[
                    "shrink-0 flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium border transition-all",
                    isTracked
                      ? "border-green-500/30 bg-green-500/10 text-green-700 dark:text-green-400 cursor-default"
                      : "border-border hover:border-foreground/40 hover:bg-muted cursor-pointer",
                  ].join(" ")}
                >
                  {isTracked ? (
                    <><Check className="size-3" /> Getting alerts</>
                  ) : (
                    <><Plus className="size-3" /> Get alerts</>
                  )}
                </button>
              </div>
            );
          })}
        </div>
      )}

      {open && !fetching && q.trim() && results.length === 0 && (
        <div className="absolute top-full mt-1 w-full z-50 rounded-lg border bg-popover shadow-md px-3 py-4 text-center text-sm text-muted-foreground">
          No companies found for "{q}"
        </div>
      )}
    </div>
  );
}
