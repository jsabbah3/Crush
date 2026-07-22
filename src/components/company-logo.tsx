"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";

// Deterministic warm-toned fallback color from the company name initial.
// Kept within the Crush palette's temperature — no cool blues/violets/cyans.
const PALETTE = [
  "bg-amber-100  text-amber-800  dark:bg-amber-950/50  dark:text-amber-300",
  "bg-orange-100 text-orange-800 dark:bg-orange-950/50 dark:text-orange-300",
  "bg-stone-200  text-stone-700  dark:bg-stone-800/60  dark:text-stone-300",
  "bg-red-100    text-red-800    dark:bg-red-950/50    dark:text-red-300",
  "bg-yellow-100 text-yellow-800 dark:bg-yellow-950/50 dark:text-yellow-300",
  "bg-lime-100   text-lime-800   dark:bg-lime-950/50   dark:text-lime-300",
  "bg-rose-100   text-rose-800   dark:bg-rose-950/50   dark:text-rose-300",
  "bg-amber-200  text-amber-900  dark:bg-amber-900/50  dark:text-amber-200",
];

function colorFor(name: string) {
  return PALETTE[name.charCodeAt(0) % PALETTE.length];
}

function extractDomain(website: string | null): string | null {
  if (!website) return null;
  try {
    return new URL(website).hostname.replace(/^www\./, "");
  } catch {
    return null;
  }
}

// Try multiple logo sources in order, falling back to next on error
function logoUrls(website: string | null, name: string): string[] {
  const domain = extractDomain(website);
  const urls: string[] = [];

  if (domain) {
    // Google's favicon service — reliable, no API key needed
    urls.push(`https://www.google.com/s2/favicons?domain=${domain}&sz=128`);
  }

  return urls;
}

export function CompanyLogo({
  name,
  website,
  className,
  size = "md",
}: {
  name: string;
  website: string | null;
  className?: string;
  size?: "sm" | "md" | "lg";
}) {
  const sources = logoUrls(website, name);
  const [srcIndex, setSrcIndex] = useState(0);
  const color = colorFor(name);
  const initial = name.charAt(0).toUpperCase();

  const sizeClass = {
    sm: "size-8 text-sm rounded-lg",
    md: "size-12 text-base rounded-xl",
    lg: "size-16 text-xl rounded-2xl",
  }[size];

  const currentSrc = sources[srcIndex] ?? null;

  if (currentSrc) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={currentSrc}
        alt={name}
        onError={() => setSrcIndex((i) => i + 1)}
        className={cn(
          "object-contain border border-border/50 bg-white p-1",
          sizeClass,
          className
        )}
      />
    );
  }

  return (
    <div
      className={cn(
        "flex items-center justify-center font-semibold shrink-0",
        sizeClass,
        color,
        className
      )}
    >
      {initial}
    </div>
  );
}
