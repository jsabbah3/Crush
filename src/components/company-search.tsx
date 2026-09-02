"use client";

import { useState, useRef, useEffect, useTransition } from "react";
import { Search, Plus, Check, Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { followCompany } from "@/app/actions/tracking";
import { CompanyLogo } from "@/components/company-logo";
import { cn } from "@/lib/utils";

type Result = {
  id: string;
  name: string;
  slug: string;
  website: string | null;
  industry: string | null;
};

export function CompanySearch({
  trackedCompanyIds,
  size = "default",
  className,
  placeholder = "Search companies to follow…",
}: {
  trackedCompanyIds: string[];
  /** "lg" is the prominent, page-anchoring treatment — bigger input, wider,
   *  no max-width cap (the parent controls width). "default" is the compact
   *  inline widget. */
  size?: "default" | "lg";
  className?: string;
  placeholder?: string;
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

  const lg = size === "lg";

  return (
    <div ref={containerRef} className={cn("relative w-full", !className && (lg ? "" : "max-w-md"), className)}>
      <div className="relative">
        <Search className={cn(
          "absolute top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none",
          lg ? "left-4 size-5" : "left-2.5 size-3.5",
        )} />
        {fetching && (
          <Loader2 className={cn(
            "absolute top-1/2 -translate-y-1/2 text-muted-foreground animate-spin",
            lg ? "right-4 size-5" : "right-2.5 size-3.5",
          )} />
        )}
        <input
          ref={inputRef}
          type="text"
          placeholder={placeholder}
          value={q}
          onChange={(e) => setQ(e.target.value)}
          onFocus={() => results.length > 0 && setOpen(true)}
          className={cn(
            "w-full rounded-md border border-input bg-background focus:outline-none focus:ring-1 focus:ring-ring",
            lg ? "h-14 pl-12 pr-12 text-base rounded-xl shadow-sm" : "h-9 pl-8 pr-8 text-sm",
          )}
        />
      </div>

      {open && results.length > 0 && (
        <div className={cn(
          "absolute top-full left-0 w-full z-50 border border-border/60 bg-popover shadow-lg overflow-hidden",
          lg ? "mt-2 min-w-[360px] rounded-xl" : "mt-1.5 min-w-[360px] rounded-xl",
        )}>
          {results.map((company, i) => {
            const isTracked = trackedSet.has(company.id);
            return (
              <div
                key={company.id}
                className={cn(
                  "flex items-center gap-3.5 hover:bg-muted/50 transition-colors",
                  lg ? "px-5 py-4" : "px-4 py-3.5",
                  i > 0 && "border-t border-border/40",
                )}
              >
                <CompanyLogo
                  name={company.name}
                  website={company.website}
                  size={lg ? "lg" : "md"}
                  className={cn("shrink-0 rounded-lg", lg ? "size-11" : "size-9")}
                />
                <div className="flex-1 min-w-0">
                  <p className={cn("font-semibold truncate", lg ? "text-[15px]" : "text-sm")}>{company.name}</p>
                  {company.industry && (
                    <p className="text-xs text-muted-foreground truncate mt-0.5">{company.industry}</p>
                  )}
                </div>
                <button
                  onClick={() => !isTracked && handleFollow(company)}
                  disabled={isTracked || isPending}
                  className={cn(
                    "shrink-0 flex items-center gap-1.5 rounded-full border font-medium transition-all",
                    lg ? "px-3.5 py-2 text-sm" : "px-3 py-1.5 text-xs",
                    isTracked
                      ? "border-moss/30 bg-moss/10 text-moss cursor-default"
                      : "border-border hover:border-foreground/40 hover:bg-muted cursor-pointer",
                  )}
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
        <div className={cn(
          "absolute top-full w-full z-50 rounded-lg border bg-popover shadow-md text-center text-sm text-muted-foreground",
          lg ? "mt-2 px-4 py-5" : "mt-1 px-3 py-4",
        )}>
          No companies found for &ldquo;{q}&rdquo;
        </div>
      )}
    </div>
  );
}
