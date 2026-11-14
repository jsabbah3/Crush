import Link from "next/link";
import { CompanyLogo } from "@/components/company-logo";
import { Rank } from "@/components/brand";

export type HotListRow = {
  name: string;
  slug: string;
  website: string | null;
  openRoles: number;
};

/**
 * The landing page's centrepiece: the companies people on Crush follow most,
 * ranked, with today's open-role counts — real numbers, set like the hot list
 * in a weekly magazine.
 */
export function HotList({ rows, dateline }: { rows: HotListRow[]; dateline: string }) {
  if (rows.length === 0) return null;
  return (
    <figure className="frame relative w-full px-5 pb-5 pt-4 shadow-[10px_10px_0_-1px_var(--foreground)] sm:px-7 sm:pb-6">
      <figcaption className="flex items-baseline justify-between gap-4 border-b border-foreground pb-3">
        <span className="kicker">The list</span>
        <span className="font-mono text-[0.7rem] text-muted-foreground">{dateline}</span>
      </figcaption>

      <p className="mt-4 font-heading text-[1.65rem] font-bold leading-[1.05] tracking-[-0.025em]">
        Most-watched on Crush
      </p>

      <ol className="mt-4 divide-y divide-foreground/15 border-t border-foreground/15">
        {rows.map((r, i) => (
          <li key={r.slug}>
            <Link
              href={`/companies/${r.slug}`}
              className="group flex items-baseline gap-3 py-3 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <Rank n={i + 1} className="w-8 shrink-0 text-2xl text-primary" />
              <CompanyLogo name={r.name} website={r.website} size="sm" className="size-6 translate-y-1" />
              <span className="truncate font-heading text-lg font-semibold tracking-[-0.01em] group-hover:underline group-hover:decoration-primary group-hover:decoration-2 group-hover:underline-offset-4">
                {r.name}
              </span>
              <span className="leader" />
              <span className="shrink-0 font-mono text-sm tabular-nums">
                {r.openRoles}
                <span className="text-muted-foreground"> open</span>
              </span>
            </Link>
          </li>
        ))}
      </ol>

      <p className="mt-4 flex items-start gap-2 border-t border-foreground pt-3 text-sm leading-snug text-muted-foreground">
        <span aria-hidden className="mt-1.5 inline-block size-2 shrink-0 rounded-full bg-primary" />
        <span>
          Open roles, counted this morning. When one matching <em className="font-heading text-[1.05em] text-foreground">your</em>{" "}
          title opens at a company on your list, you get one email.
        </span>
      </p>
    </figure>
  );
}
