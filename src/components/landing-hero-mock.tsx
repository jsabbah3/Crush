"use client";

import { useEffect, useRef, useState } from "react";
import { CompanyLogo } from "@/components/company-logo";

const MOCK_WATCHLIST = [
  { name: "Anthropic", website: "https://anthropic.com", industry: "AI Research", matches: 2 },
  { name: "Linear", website: "https://linear.app", industry: "Dev Tools", matches: 1 },
  { name: "Stripe", website: "https://stripe.com", industry: "Fintech", matches: 0 },
  { name: "Vercel", website: "https://vercel.com", industry: "Dev Tools", matches: 0 },
];

/**
 * Landing product mock. On mount, the watchlist rows stagger in and a new
 * match "arrives" — the card rises in and the header counter ticks up — so the
 * hero shows the product's core moment instead of a static screenshot.
 * Fully static under prefers-reduced-motion (global rule zeroes the durations).
 */
export function LandingHeroMock() {
  const [matchArrived, setMatchArrived] = useState(false);
  const [count, setCount] = useState(2);
  const ran = useRef(false);

  useEffect(() => {
    if (ran.current) return;
    ran.current = true;

    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduced) {
      setMatchArrived(true);
      setCount(3);
      return;
    }

    const revealAt = window.setTimeout(() => setMatchArrived(true), 900);
    const tickAt = window.setTimeout(() => setCount(3), 1150);
    return () => {
      window.clearTimeout(revealAt);
      window.clearTimeout(tickAt);
    };
  }, []);

  return (
    <div className="rounded-2xl border border-border/70 bg-card shadow-xl overflow-hidden">
      {/* Browser chrome */}
      <div className="border-b border-border/50 bg-muted/30 px-4 py-2.5 flex items-center gap-2">
        <div className="flex gap-1.5">
          <div className="h-2.5 w-2.5 rounded-full bg-border" />
          <div className="h-2.5 w-2.5 rounded-full bg-border" />
          <div className="h-2.5 w-2.5 rounded-full bg-border" />
        </div>
        <div className="flex-1 mx-3 rounded bg-background/80 border border-border/40 px-3 py-1">
          <span className="text-[11px] text-muted-foreground/60 font-mono">crushco.app/dashboard</span>
        </div>
      </div>

      {/* Dashboard content */}
      <div className="p-5 space-y-4">
        <div className="flex items-center justify-between">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">My watchlist</p>
          <span className="font-mono text-[11px] text-primary font-medium tabular-nums">
            {count} new {count === 1 ? "match" : "matches"}
          </span>
        </div>

        {/* Company rows */}
        <div className="space-y-2 stagger-children">
          {MOCK_WATCHLIST.map((c) => (
            <div
              key={c.name}
              className="animate-rise flex items-center justify-between rounded-xl border border-border/60 bg-background p-3"
            >
              <div className="flex items-center gap-3">
                <CompanyLogo name={c.name} website={c.website} size="sm" />
                <div>
                  <p className="text-sm font-semibold leading-none">{c.name}</p>
                  <p className="text-[11px] text-muted-foreground mt-0.5">{c.industry}</p>
                </div>
              </div>
              {c.matches > 0 ? (
                <span className="font-mono text-[11px] font-semibold bg-amber text-amber-foreground rounded-full px-2 py-0.5 tabular-nums">
                  {c.matches} new
                </span>
              ) : (
                <span className="text-[11px] text-muted-foreground/50">Watching</span>
              )}
            </div>
          ))}
        </div>

        {/* Match card — arrives after the rows settle */}
        <div
          className="grid transition-[grid-template-rows,opacity] duration-[var(--dur-med)] ease-[var(--ease-settle)]"
          style={{
            gridTemplateRows: matchArrived ? "1fr" : "0fr",
            opacity: matchArrived ? 1 : 0,
          }}
        >
          <div className="overflow-hidden">
            <div className="rounded-xl border border-primary/25 bg-primary/5 p-3.5 space-y-1.5">
              <div className="flex items-center gap-1.5">
                <span className="h-1.5 w-1.5 rounded-full bg-primary" />
                <p className="text-[11px] font-semibold text-primary uppercase tracking-wide">New match</p>
              </div>
              <p className="text-sm font-semibold text-foreground">Staff Engineer, ML Infrastructure</p>
              <p className="font-mono text-[11px] text-muted-foreground tabular-nums">
                Anthropic · Remote · Full-time · posted today
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
