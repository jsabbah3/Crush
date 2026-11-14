"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";

// Fallback for a company with no logo: its initial, set like a drop cap, on
// one of three paper tints picked deterministically from the name.
const INKS = [
  "bg-wash text-foreground",
  "bg-kraft-soft text-clay",
  "bg-note text-note-foreground",
];

function inkFor(name: string) {
  return INKS[name.charCodeAt(0) % INKS.length];
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
function logoUrls(website: string | null): string[] {
  const domain = extractDomain(website);
  const urls: string[] = [];

  if (domain) {
    // Google's favicon service — reliable, no API key needed
    urls.push(`https://www.google.com/s2/favicons?domain=${domain}&sz=128`);
  }

  return urls;
}

/** A company's logo on a white tile — favicons are drawn for white. */
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
  const sources = logoUrls(website);
  const [srcIndex, setSrcIndex] = useState(0);
  const initial = name.charAt(0).toUpperCase();
  const currentSrc = sources[srcIndex] ?? null;
  const sizeClass = { sm: "size-8 text-sm", md: "size-12 text-xl", lg: "size-16 text-3xl" }[size];
  const pad = { sm: "p-0.5", md: "p-1.5", lg: "p-2" }[size];

  return (
    <span
      className={cn(
        "paper-light tile inline-block shrink-0 overflow-hidden",
        sizeClass,
        currentSrc && pad,
        className,
      )}
    >
      {currentSrc ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={currentSrc}
          alt={name}
          onError={() => setSrcIndex((i) => i + 1)}
          className="block size-full object-contain"
        />
      ) : (
        <span
          className={cn(
            "flex size-full items-center justify-center font-heading font-bold italic leading-none",
            inkFor(name),
          )}
        >
          {initial}
        </span>
      )}
    </span>
  );
}
