import { cn } from "@/lib/utils";

type Point = { capturedOn: Date; openRolesTotal: number };

function fmt(d: Date) {
  return new Date(d).toLocaleDateString("en-US", { month: "short", day: "numeric", timeZone: "UTC" });
}

/**
 * Open-role count over time, from the daily snapshots. A watchlist asks people
 * to wait; this is what tells them whether the wait is going anywhere — is the
 * company adding roles, holding, or shrinking its hiring.
 *
 * Renders nothing until there's at least a week of history: a three-point
 * "trend" is noise, and the first days after a board is connected are a
 * bulk-import spike, not hiring.
 */
export function HiringPulse({
  points,
  postedLast30,
  className,
}: {
  points: Point[];
  postedLast30: number;
  className?: string;
}) {
  if (points.length < 7) return null;

  const values = points.map((p) => p.openRolesTotal);
  const now = values[values.length - 1];
  const first = values[0];
  const max = Math.max(...values, 1);
  const min = Math.min(...values);
  const delta = now - first;

  const W = 240;
  const H = 56;
  const span = Math.max(max - min, 1);
  const x = (i: number) => (i / (values.length - 1)) * W;
  const y = (v: number) => H - 4 - ((v - min) / span) * (H - 10);
  const line = values.map((v, i) => `${i === 0 ? "M" : "L"}${x(i).toFixed(1)} ${y(v).toFixed(1)}`).join(" ");
  const area = `${line} L${W} ${H} L0 ${H} Z`;

  const verdict =
    delta > Math.max(2, first * 0.1)
      ? { word: "Hiring more", tone: "text-moss" }
      : delta < -Math.max(2, first * 0.1)
        ? { word: "Hiring less", tone: "text-clay" }
        : { word: "Holding steady", tone: "text-airmail" };

  return (
    <div className={cn("sheet rounded-[4px] p-4", className)}>
      <div className="flex items-baseline justify-between gap-3">
        <h2 className="label-caps text-muted-foreground">Hiring pulse</h2>
        <span className={cn("label-caps", verdict.tone)}>{verdict.word}</span>
      </div>

      <div className="mt-3 flex items-end gap-3">
        <p className="font-heading text-4xl font-black leading-none tracking-[-0.03em]">{now}</p>
        <p className="pb-0.5 text-xs leading-tight text-muted-foreground">
          open roles
          <br />
          <span className="font-mono tabular-nums">
            {delta === 0 ? "no change" : `${delta > 0 ? "+" : "−"}${Math.abs(delta)}`} since {fmt(points[0].capturedOn)}
          </span>
        </p>
      </div>

      <svg
        viewBox={`0 0 ${W} ${H}`}
        preserveAspectRatio="none"
        className="mt-3 h-14 w-full overflow-visible"
        role="img"
        aria-label={`Open roles went from ${first} to ${now} between ${fmt(points[0].capturedOn)} and ${fmt(points[points.length - 1].capturedOn)}`}
      >
        <path d={area} className="fill-airmail-soft" />
        <path
          d={line}
          fill="none"
          className="stroke-airmail"
          strokeWidth="2"
          strokeLinejoin="round"
          strokeLinecap="round"
          vectorEffect="non-scaling-stroke"
        />
        <circle cx={x(values.length - 1)} cy={y(now)} r="3.5" className="fill-primary" />
      </svg>

      <p className="mt-3 border-t border-dashed border-foreground/20 pt-3 text-xs leading-relaxed text-muted-foreground">
        <span className="font-mono font-semibold tabular-nums text-foreground">{postedLast30}</span>{" "}
        {postedLast30 === 1 ? "role" : "roles"} posted in the last 30 days.
      </p>
    </div>
  );
}
