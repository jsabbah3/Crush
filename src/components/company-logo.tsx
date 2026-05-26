"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";

// Deterministic color from company name initial
const PALETTE = [
  "bg-violet-100 text-violet-700",
  "bg-blue-100   text-blue-700",
  "bg-emerald-100 text-emerald-700",
  "bg-orange-100 text-orange-700",
  "bg-rose-100   text-rose-700",
  "bg-cyan-100   text-cyan-700",
  "bg-amber-100  text-amber-700",
  "bg-indigo-100 text-indigo-700",
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
