"use client";

import { useEffect, useRef, useState } from "react";
import { ArrowRight, Loader2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { CompanyLogo } from "@/components/company-logo";
import { Rank } from "@/components/brand";
import { signInWithGoogle } from "@/app/actions/auth";
import { addAnonTracked, getAnonTracked, removeAnonTracked } from "@/lib/anon-tracking";
import { analytics } from "@/lib/analytics";
import { cn } from "@/lib/utils";

export type Pick = {
  id: string;
  name: string;
  slug: string;
  website: string | null;
  openRoles: number;
};

// Display copy of the list. The ids themselves live in anon-tracking, which
// AnonTrackingReplay turns into real follows on the first page after sign-in.
const LIST_KEY = "crush_anon_list";
const MAX_PICKS = 8;

function readList(): Pick[] {
  try {
    const raw = localStorage.getItem(LIST_KEY);
    const list = raw ? (JSON.parse(raw) as Pick[]) : [];
    const ids = new Set(getAnonTracked());
    return list.filter((p) => ids.has(p.id));
  } catch {
    return [];
  }
}

function writeList(list: Pick[]) {
  try {
    localStorage.setItem(LIST_KEY, JSON.stringify(list));
  } catch {
    // private mode — the list still works for this visit
  }
}

/**
 * The landing page's working part: name the companies you'd leave for before
 * you have an account. Each pick is stashed locally and followed for real the
 * moment the visitor signs in, so signing up is the last step of something
 * they've already started rather than the price of finding out what this is.
 */
export function ListBuilder({ popular }: { popular: Pick[] }) {
  const [q, setQ] = useState("");
  const [results, setResults] = useState<Pick[]>([]);
  const [open, setOpen] = useState(false);
  const [fetching, setFetching] = useState(false);
  const [active, setActive] = useState(0);
  const [picks, setPicks] = useState<Pick[]>([]);
  const [fresh, setFresh] = useState<string | null>(null);
  const boxRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const seq = useRef(0);

  useEffect(() => {
    // localStorage is only readable after mount; reading it during render
    // would mismatch the server HTML.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setPicks(readList());
  }, []);

  useEffect(() => {
    const term = q.trim();
    if (term.length < 2) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setResults([]);
      setOpen(false);
      return;
    }
    const mine = ++seq.current;
    const t = setTimeout(async () => {
      setFetching(true);
      try {
        const res = await fetch(`/api/companies/suggest?q=${encodeURIComponent(term)}`);
        const data = (await res.json()) as Pick[];
        if (mine !== seq.current) return; // a newer keystroke already answered
        setResults(data);
        setActive(0);
        setOpen(true);
      } catch {
        if (mine === seq.current) setResults([]);
      } finally {
        if (mine === seq.current) setFetching(false);
      }
    }, 180);
    return () => clearTimeout(t);
  }, [q]);

  useEffect(() => {
    function onDown(e: MouseEvent) {
      if (boxRef.current && !boxRef.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, []);

  const pickedIds = new Set(picks.map((p) => p.id));
  const full = picks.length >= MAX_PICKS;

  function add(p: Pick, source: "search" | "popular") {
    if (pickedIds.has(p.id) || full) return;
    const next = [...picks, p];
    setPicks(next);
    writeList(next);
    addAnonTracked(p.id);
    setFresh(p.id);
    setQ("");
    setOpen(false);
    analytics.track("landing_list_add", {
      company_id: p.id,
      company_name: p.name,
      source,
      list_size: next.length,
    });
    inputRef.current?.focus();
  }

  function remove(id: string) {
    const next = picks.filter((p) => p.id !== id);
    setPicks(next);
    writeList(next);
    removeAnonTracked(id);
  }

  function onKeyDown(e: React.KeyboardEvent) {
    if (!open || results.length === 0) return;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActive((i) => (i + 1) % results.length);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActive((i) => (i - 1 + results.length) % results.length);
    } else if (e.key === "Enter") {
      e.preventDefault();
      add(results[active], "search");
    } else if (e.key === "Escape") {
      setOpen(false);
    }
  }

  const suggestions = popular.filter((p) => !pickedIds.has(p.id)).slice(0, 5);
  const openNow = picks.reduce((n, p) => n + p.openRoles, 0);

  return (
    <div className="space-y-4">
      {/* The entry line */}
      <div ref={boxRef} className="relative">
        <label
          htmlFor="crush-to"
          className="flex items-center gap-3 border-b-[3px] border-foreground bg-paper px-4 py-3 shadow-[inset_0_0_0_1px_var(--border)] focus-within:border-primary"
        >
          <span className="rank shrink-0 text-xl text-primary">
            {String(Math.min(picks.length + 1, MAX_PICKS)).padStart(2, "0")}
          </span>
          <input
            id="crush-to"
            ref={inputRef}
            value={q}
            onChange={(e) => setQ(e.target.value)}
            onFocus={() => results.length > 0 && setOpen(true)}
            onKeyDown={onKeyDown}
            disabled={full}
            autoComplete="off"
            spellCheck={false}
            role="combobox"
            aria-expanded={open}
            aria-controls="crush-to-results"
            aria-autocomplete="list"
            placeholder={full ? "That's a full list" : "Add a company you'd leave for…"}
            className="min-w-0 flex-1 bg-transparent font-heading text-xl font-semibold outline-none placeholder:font-normal placeholder:italic placeholder:text-muted-foreground/70 sm:text-2xl"
          />
          {fetching && <Loader2 className="size-4 shrink-0 animate-spin text-muted-foreground" />}
        </label>

        {open && (
          <ul
            id="crush-to-results"
            role="listbox"
            className="sheet absolute inset-x-0 top-full z-30 mt-1 overflow-hidden border-foreground py-1 shadow-[6px_6px_0_-1px_var(--foreground)]"
          >
            {results.length === 0 ? (
              <li className="px-4 py-3 text-sm text-muted-foreground">
                Not on file yet. Sign in and you can add any company by name.
              </li>
            ) : (
              results.map((r, i) => {
                const picked = pickedIds.has(r.id);
                return (
                  <li key={r.id} role="option" aria-selected={i === active}>
                    <button
                      type="button"
                      onMouseEnter={() => setActive(i)}
                      onClick={() => add(r, "search")}
                      disabled={picked}
                      className={cn(
                        "flex w-full items-center gap-3 px-4 py-2.5 text-left",
                        i === active && !picked && "bg-accent",
                        picked && "opacity-50",
                      )}
                    >
                      <CompanyLogo name={r.name} website={r.website} size="sm" />
                      <span className="min-w-0 flex-1 truncate font-semibold">{r.name}</span>
                      <span className="shrink-0 font-mono text-xs tabular-nums text-muted-foreground">
                        {picked
                          ? "on your list"
                          : r.openRoles > 0
                            ? `${r.openRoles} open now`
                            : "watching for roles"}
                      </span>
                    </button>
                  </li>
                );
              })
            )}
          </ul>
        )}
      </div>

      {/* The list so far */}
      {picks.length > 0 ? (
        <div className="space-y-4">
          <ol className="border-t border-foreground">
            {picks.map((p, i) => (
              <li
                key={p.id}
                className={cn(
                  "group flex items-baseline gap-3 border-b border-foreground/15 px-1 py-2",
                  p.id === fresh && "animate-slot",
                )}
              >
                <Rank n={i + 1} className="w-7 shrink-0 text-lg text-muted-foreground" />
                <CompanyLogo name={p.name} website={p.website} size="sm" className="size-6 translate-y-1" />
                <span className="truncate font-heading text-lg font-semibold tracking-[-0.01em]">{p.name}</span>
                <span className="leader" />
                <span className="shrink-0 font-mono text-xs tabular-nums text-muted-foreground">
                  {p.openRoles > 0 ? `${p.openRoles} open` : "watching"}
                </span>
                <button
                  type="button"
                  onClick={() => remove(p.id)}
                  aria-label={`Remove ${p.name}`}
                  className="flex size-6 shrink-0 translate-y-1.5 cursor-pointer items-center justify-center self-start text-muted-foreground hover:text-primary"
                >
                  <X className="size-3.5" />
                </button>
              </li>
            ))}
          </ol>

          <form action={signInWithGoogle} className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-4">
            <Button type="submit" size="xl" className="w-full sm:w-auto">
              Start watching {picks.length === 1 ? "it" : `these ${picks.length}`}
              <ArrowRight className="size-4" />
            </Button>
            <p className="text-sm leading-snug text-muted-foreground">
              {openNow > 0 ? (
                <>
                  <span className="font-mono font-semibold tabular-nums text-foreground">{openNow.toLocaleString()}</span>{" "}
                  roles open across your list right now. Free, sign in with Google.
                </>
              ) : (
                <>Free. Sign in with Google and we start watching today.</>
              )}
            </p>
          </form>
        </div>
      ) : (
        <div className="flex flex-wrap items-center gap-x-2 gap-y-2">
          <span className="label-caps mr-1 text-muted-foreground">Popular</span>
          {suggestions.map((p) => (
            <button
              key={p.id}
              type="button"
              onClick={() => add(p, "popular")}
              className="inline-flex cursor-pointer items-center gap-1.5 border border-foreground/25 bg-paper py-1 pl-1 pr-2.5 text-sm font-medium hover:border-foreground"
            >
              <CompanyLogo name={p.name} website={p.website} size="sm" className="size-5" />
              {p.name}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
