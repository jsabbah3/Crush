"use client";

import { useState, type CSSProperties } from "react";
import { cn } from "@/lib/utils";

// Fallback inks for a company with no logo: one of the four colours already
// on an airmail envelope, picked deterministically from the name.
const INKS = [
  "bg-note text-note-foreground",
  "bg-airmail-soft text-airmail",
  "bg-kraft-soft text-clay",
  "bg-moss-soft text-moss",
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

/**
 * A company, as a postage stamp. At `md` and `lg` the tile gets perforated
 * edges; at `sm` (and anywhere a caller shrinks it further) perforations would
 * turn to noise, so it's a plain cut square instead.
 */
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

  const face = currentSrc ? (
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
        "flex size-full items-center justify-center font-heading font-extrabold leading-none",
        inkFor(name),
      )}
    >
      {initial}
    </span>
  );

  if (size === "sm") {
    return (
      <span
        className={cn(
          "paper-light inline-block size-8 shrink-0 overflow-hidden rounded-[3px] border border-foreground/15 bg-white text-sm",
          currentSrc && "p-0.5",
          className,
        )}
      >
        {face}
      </span>
    );
  }

  const sizeClass = { md: "size-12 text-lg", lg: "size-16 text-2xl" }[size];
  const perf = { md: "6px", lg: "8px" }[size];
  const hole = { md: "1.9px", lg: "2.4px" }[size];

  return (
    <span className={cn("stamp-lift inline-block shrink-0", sizeClass, className)}>
      <span
        className="stamp paper-light block size-full"
        style={{ "--perf": perf, "--hole": hole } as CSSProperties}
      >
        {face}
      </span>
    </span>
  );
}
