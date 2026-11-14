import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

/**
 * Crush's brand kit. The look is a weekly magazine's hot list: one ink, one
 * signal colour, numbered ranks and printed rules. Everything here is CSS and
 * type — no image assets — so it themes with the tokens.
 */

/** The mark: a vermilion dot — the one signal Crush ever sends. */
export function Mark({ className }: { className?: string }) {
  return <span aria-hidden className={cn("inline-block size-2 shrink-0 rounded-full bg-primary", className)} />;
}

/** The nameplate: "Crush" set heavy, with the dot as its full stop. */
export function Wordmark({ className, size = "md" }: { className?: string; size?: "sm" | "md" | "lg" }) {
  const text = { sm: "text-[1.3rem]", md: "text-[1.6rem]", lg: "text-5xl" }[size];
  return (
    <span className={cn("inline-flex select-none items-baseline", text, className)}>
      <span className="font-heading font-extrabold leading-none tracking-[-0.045em]">Crush</span>
      <span aria-hidden className="ml-[0.06em] inline-block size-[0.2em] rounded-full bg-primary" />
    </span>
  );
}

/** Masthead double rule — thick over thin. */
export function Rule({ className }: { className?: string }) {
  return <div aria-hidden className={cn("rule-double w-full", className)} />;
}

/** A printed tag: narrow caps in a hairline box. `solid` fills it. */
export function Tag({
  children,
  tone = "red",
  solid = false,
  className,
}: {
  children: ReactNode;
  tone?: "red" | "ink" | "graphite" | "kraft";
  solid?: boolean;
  className?: string;
}) {
  const color = {
    red: "text-primary",
    ink: "text-foreground",
    graphite: "text-graphite",
    kraft: "text-clay",
  }[tone];
  return (
    <span className={cn("tag", color, solid && "tag-solid", className)}>
      {solid ? <span>{children}</span> : children}
    </span>
  );
}

/** A list position, magazine style: 01, 02 … */
export function Rank({ n, className }: { n: number; className?: string }) {
  return <span className={cn("rank tabular-nums", className)}>{String(n).padStart(2, "0")}</span>;
}

/**
 * Page title block used across the app: a heavy rule, a small caps kicker,
 * then the headline — the way a magazine opens a section.
 */
export function PageHeader({
  eyebrow,
  title,
  children,
  action,
  className,
}: {
  eyebrow?: ReactNode;
  title: ReactNode;
  children?: ReactNode;
  action?: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("border-t-[3px] border-foreground pt-4", className)}>
      <div className="flex flex-wrap items-end justify-between gap-x-6 gap-y-3">
        <div className="min-w-0 space-y-2">
          {eyebrow && <p className="label-caps text-graphite">{eyebrow}</p>}
          <h1 className="font-heading text-[2.25rem] font-bold leading-[1.02] tracking-[-0.03em] sm:text-[2.85rem]">
            {title}
          </h1>
          {children && <div className="max-w-[60ch] text-sm leading-relaxed text-muted-foreground">{children}</div>}
        </div>
        {action && <div className="shrink-0">{action}</div>}
      </div>
    </div>
  );
}

/**
 * An empty list: a blank numbered line where the first entry will go, so the
 * empty state reads as the start of a list rather than an error.
 */
export function EmptyState({
  kicker,
  title,
  children,
  action,
  className,
}: {
  /** A few words of small caps over the title, e.g. "Nothing new today". */
  kicker: string;
  title: ReactNode;
  children?: ReactNode;
  action?: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("border-y border-foreground/80 px-1 py-10 sm:py-12", className)}>
      <div className="flex items-baseline gap-4">
        <Rank n={1} className="text-3xl text-muted-foreground/50" />
        <span className="leader" />
      </div>
      <div className="mt-6 max-w-md space-y-2">
        <p className="label-caps text-graphite">{kicker}</p>
        <p className="font-heading text-2xl font-bold leading-tight tracking-[-0.02em]">{title}</p>
        {children && <p className="leading-relaxed text-muted-foreground">{children}</p>}
      </div>
      {action && <div className="mt-5 flex flex-wrap gap-2">{action}</div>}
    </div>
  );
}
