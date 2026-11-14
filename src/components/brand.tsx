import type { CSSProperties, ReactNode } from "react";
import { cn } from "@/lib/utils";

/**
 * Crush's brand kit: the handful of postal marks the whole interface is built
 * from. Everything here is inline SVG or CSS — no image assets — so it themes
 * with the tokens and stays sharp at any size.
 */

// A wax seal's edge: a circle that wobbles in and out, like wax pressed flat.
const SEAL_PATH = (() => {
  const lobes = 11;
  const steps = lobes * 12;
  const points: string[] = [];
  for (let i = 0; i <= steps; i++) {
    const t = (i / steps) * Math.PI * 2;
    const r = 46 + 3.2 * Math.cos(lobes * t) + 1.1 * Math.sin(3 * t + 0.6);
    const x = 50 + r * Math.cos(t);
    const y = 50 + r * Math.sin(t);
    points.push(`${i === 0 ? "M" : "L"}${x.toFixed(2)} ${y.toFixed(2)}`);
  }
  return `${points.join(" ")}Z`;
})();

const HEART_PATH =
  "M50 72 C50 72 26 57 26 41.5 C26 33 32.5 27 40 27 C44.5 27 48 29.4 50 33 C52 29.4 55.5 27 60 27 C67.5 27 74 33 74 41.5 C74 57 50 72 50 72 Z";

/** The mark: a heart pressed into red sealing wax. */
export function Seal({ className, title }: { className?: string; title?: string }) {
  return (
    <svg
      viewBox="0 0 100 100"
      className={cn("size-6 shrink-0", className)}
      role={title ? "img" : undefined}
      aria-hidden={title ? undefined : true}
      aria-label={title}
    >
      <path d={SEAL_PATH} fill="var(--primary)" />
      {/* the ring a seal-stamp leaves */}
      <circle cx="50" cy="50" r="35" fill="none" stroke="var(--primary-deep)" strokeWidth="2.5" opacity="0.55" />
      <path d={HEART_PATH} fill="var(--primary-foreground)" />
    </svg>
  );
}

export function Wordmark({ className, size = "md" }: { className?: string; size?: "sm" | "md" | "lg" }) {
  const text = { sm: "text-[1.15rem]", md: "text-[1.4rem]", lg: "text-4xl" }[size];
  const seal = { sm: "size-5", md: "size-6", lg: "size-10" }[size];
  return (
    <span className={cn("inline-flex items-center gap-1.5 select-none", className)}>
      <Seal className={seal} />
      <span className={cn("font-heading font-black italic leading-none tracking-[-0.02em]", text)}>
        Crush
      </span>
    </span>
  );
}

/** The red-and-blue chevron edge of an airmail envelope. */
export function AirmailRule({ className }: { className?: string }) {
  return <div aria-hidden className={cn("airmail-rule w-full", className)} />;
}

/**
 * A circular date stamp with cancellation waves — the mark that says a letter
 * actually went through the post. `top` runs around the rim; `lines` sit in
 * the middle like a date.
 */
export function Postmark({
  top,
  lines,
  className,
  waves = true,
  style,
}: {
  top: string;
  lines: [string, string?];
  className?: string;
  waves?: boolean;
  style?: CSSProperties;
}) {
  const id = `pm-${top.replace(/[^a-z0-9]/gi, "")}`;
  return (
    <svg
      viewBox={waves ? "0 0 190 100" : "0 0 100 100"}
      className={cn("h-16 w-auto shrink-0", className)}
      style={style}
      aria-hidden
    >
      <defs>
        <path id={id} d="M50 50 m-36 0 a36 36 0 1 1 72 0" />
      </defs>
      <g fill="none" stroke="currentColor" strokeWidth="2">
        <circle cx="50" cy="50" r="46" />
        <circle cx="50" cy="50" r="28" strokeWidth="1.25" />
        {waves &&
          [30, 42, 54, 66].map((y) => (
            <path
              key={y}
              strokeWidth="2"
              strokeLinecap="round"
              d={`M102 ${y} q11 -8 22 0 t22 0 t22 0 t20 0`}
            />
          ))}
      </g>
      <text
        fill="currentColor"
        fontSize="9.5"
        fontWeight="700"
        letterSpacing="2.2"
        style={{ fontFamily: "var(--font-archivo)", fontStretch: "75%" }}
      >
        <textPath href={`#${id}`} startOffset="50%" textAnchor="middle">
          {top.toUpperCase()}
        </textPath>
      </text>
      <text
        x="50"
        y={lines[1] ? 48 : 54}
        textAnchor="middle"
        fill="currentColor"
        fontSize="11"
        fontWeight="600"
        style={{ fontFamily: "var(--font-plex-mono)" }}
      >
        {lines[0]}
      </text>
      {lines[1] && (
        <text
          x="50"
          y="61"
          textAnchor="middle"
          fill="currentColor"
          fontSize="9"
          style={{ fontFamily: "var(--font-plex-mono)" }}
        >
          {lines[1]}
        </text>
      )}
    </svg>
  );
}

/** A rubber-stamped label, slightly off-square like every real one. */
export function Rubber({
  children,
  tone = "red",
  tilt = -3,
  className,
  animate = false,
}: {
  children: ReactNode;
  tone?: "red" | "blue" | "green" | "ink" | "kraft";
  tilt?: number;
  className?: string;
  animate?: boolean;
}) {
  const color = {
    red: "text-primary",
    blue: "text-airmail",
    green: "text-moss",
    ink: "text-foreground/70",
    kraft: "text-clay",
  }[tone];
  return (
    <span
      className={cn("rubber", color, animate && "animate-thunk", className)}
      style={{ "--tilt": `${tilt}deg` } as CSSProperties}
    >
      {children}
    </span>
  );
}

/** A hand-drawn underline for the one word that matters. */
export function Underline({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 300 18"
      preserveAspectRatio="none"
      aria-hidden
      className={cn("pointer-events-none absolute inset-x-0 -bottom-[0.12em] h-[0.2em] w-full", className)}
    >
      <path
        d="M4 11 C 48 3, 92 15, 140 8 S 232 4, 296 10"
        fill="none"
        stroke="currentColor"
        strokeWidth="5"
        strokeLinecap="round"
        pathLength={1}
        strokeDasharray={1}
        strokeDashoffset={1}
        style={{ animation: "draw 700ms 500ms var(--ease-settle) forwards" }}
      />
    </svg>
  );
}

/** Folded-paper plane, for the route lines. */
export function PaperPlane({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 48 48" className={cn("size-8", className)} aria-hidden>
      <path d="M3 22 L45 4 L30 44 L22 28 Z" fill="var(--paper)" stroke="currentColor" strokeWidth="2.2" strokeLinejoin="round" />
      <path d="M45 4 L22 28" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" />
      <path d="M22 28 L21 39 L26.5 34.5" fill="var(--airmail-soft)" stroke="currentColor" strokeWidth="2.2" strokeLinejoin="round" />
    </svg>
  );
}

/**
 * Page title block used across the app: a sorting-label eyebrow over a
 * Clarendon headline, with room for one action on the right.
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
    <div className={cn("flex flex-wrap items-end justify-between gap-x-6 gap-y-3", className)}>
      <div className="min-w-0 space-y-2">
        {eyebrow && <p className="label-caps text-airmail">{eyebrow}</p>}
        <h1 className="font-heading text-[2rem] font-extrabold leading-[1.05] tracking-[-0.02em] sm:text-[2.5rem]">
          {title}
        </h1>
        {children && <div className="max-w-[60ch] text-sm leading-relaxed text-muted-foreground">{children}</div>}
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </div>
  );
}

/**
 * An empty tray. The postmark carries the state ("No mail") so the copy below
 * it can spend its words on what happens next.
 */
export function EmptyState({
  stamp,
  title,
  children,
  action,
  className,
}: {
  /** Two short lines for the postmark, e.g. ["NO MAIL", "TODAY"]. */
  stamp: [string, string?];
  title: ReactNode;
  children?: ReactNode;
  action?: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex flex-col items-center gap-4 rounded-[4px] border border-dashed border-foreground/25 px-6 py-16 text-center",
        className,
      )}
    >
      <Postmark top="Crush Post" lines={stamp} waves={false} className="h-20 -rotate-[8deg] text-airmail/70" />
      <div className="space-y-1.5">
        <p className="font-heading text-2xl font-extrabold tracking-[-0.02em]">{title}</p>
        {children && <p className="mx-auto max-w-sm leading-relaxed text-muted-foreground">{children}</p>}
      </div>
      {action && <div className="mt-1 flex flex-wrap justify-center gap-2">{action}</div>}
    </div>
  );
}
