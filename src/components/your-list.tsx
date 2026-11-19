import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { Button } from "@/components/ui/button";
import { CompanyLogo } from "@/components/company-logo";
import { CompanySearch } from "@/components/company-search";
import { AddCompanyModal } from "@/components/add-company-modal";
import { RemovableRow } from "@/components/removable-row";
import { EmptyState, Rank, Tag } from "@/components/brand";
import { boardStatus } from "@/lib/board-status";
import { agoShort, getOutlook, OUTLOOK_DAYS } from "@/lib/outlook";
import { listedCollections } from "@/lib/collections";

type UserPrefs = {
  seniority?: string[];
  remoteOnly?: boolean | null;
  locationFilter?: string | null;
};

/**
 * The companies you'd leave for, as a ranked ledger: what's open at each,
 * how often each posts roles like yours, and which boards we can't read yet.
 */
export async function YourList({ userId }: { userId: string }) {
  const [tracked, trackedRoles, dbUser, collections] = await Promise.all([
    prisma.trackedCompany.findMany({
      where: { userId: userId },
      include: {
        company: {
          include: { _count: { select: { jobs: { where: { status: "ACTIVE" } } } } },
        },
        _count: { select: { matches: { where: { dismissed: false } } } },
      },
      orderBy: { createdAt: "asc" },
    }),
    prisma.trackedRole.findMany({
      where: { userId: userId },
      select: { title: true },
    }),
    prisma.user.findUnique({
      where: { id: userId },
      select: { defaultCriteria: true },
    }),
    prisma.collection.findMany({
      where: listedCollections,
      take: 3,
      orderBy: { createdAt: "asc" },
      select: {
        id: true,
        name: true,
        slug: true,
        _count: { select: { companies: true } },
        companies: {
          orderBy: { displayOrder: "asc" },
          take: 4,
          select: { company: { select: { name: true, website: true } } },
        },
      },
    }),
  ]);

  const prefs = dbUser?.defaultCriteria as UserPrefs | null;
  const outlook = await getOutlook(
    tracked.map((tc) => tc.companyId),
    trackedRoles.map((r) => r.title),
    prefs,
  );

  // "Can't see" means no readable board AND nothing on file — a company whose
  // roles reach us some other way is visible, whatever its source says.
  const canSee = (tc: (typeof tracked)[number]) =>
    boardStatus(tc.company).connected || (tc.company._count?.jobs ?? 0) > 0;
  const unconnected = tracked.filter((tc) => !canSee(tc)).length;

  return (
    <div className="space-y-8">
      <div className="max-w-2xl space-y-2">
        <p className="label-caps text-graphite">Add a company</p>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <CompanySearch
            trackedCompanyIds={tracked.map((tc) => tc.companyId)}
            placeholder="Name a company you'd leave for…"
          />
          <AddCompanyModal />
        </div>
      </div>

      {tracked.length === 0 ? (
        <EmptyState
          kicker="Your list is empty"
          title="Who's first?"
          action={
            <>
              <Link href="/companies?view=browse">
                <Button>Browse all companies</Button>
              </Link>
              <Link href="/collections">
                <Button variant="outline">Start from a collection</Button>
              </Link>
            </>
          }
        >
          Search above, browse, or borrow a ready-made list. We start reading their boards tomorrow morning.
        </EmptyState>
      ) : (
        <div className="space-y-3">
          {unconnected > 0 && (
            <p className="border-l-[3px] border-clay bg-kraft-soft/60 px-4 py-3 text-sm leading-relaxed">
              <span className="font-semibold">
                We can&apos;t see the job board for {unconnected} of your {tracked.length}{" "}
                {tracked.length === 1 ? "company" : "companies"} yet.
              </span>{" "}
              <span className="text-muted-foreground">
                No alerts can come from those until we connect them — we keep re-checking, and they&apos;re marked
                below.
              </span>
            </p>
          )}

          <ol className="border-t-[3px] border-foreground">
            {tracked.map((tc, i) => {
              const visible = canSee(tc);
              const look = outlook.get(tc.companyId);
              const open = tc.company._count?.jobs ?? 0;
              return (
                <RemovableRow key={tc.id} trackedId={tc.id} name={tc.company.name}>
                  <Link
                    href={`/companies/${tc.company.slug}`}
                    className="group grid grid-cols-[2.25rem_auto_1fr] items-center gap-x-3 gap-y-1 py-3 pl-1 pr-10 hover:bg-accent/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring sm:grid-cols-[2.5rem_auto_1fr_auto]"
                  >
                    <Rank n={i + 1} className="text-xl text-muted-foreground" />
                    <CompanyLogo name={tc.company.name} website={tc.company.website} size="sm" />
                    <div className="min-w-0">
                      <p className="flex items-center gap-2">
                        <span className="truncate font-heading text-lg font-semibold leading-snug tracking-[-0.01em] group-hover:text-primary">
                          {tc.company.name}
                        </span>
                        {tc._count.matches > 0 && (
                          <Tag className="shrink-0 text-[0.6rem]">
                            {tc._count.matches} {tc._count.matches === 1 ? "match" : "matches"}
                          </Tag>
                        )}
                      </p>
                      {visible ? (
                        // "None like yours" only when there's truly nothing: a
                        // company can have matches on postings older than 90 days.
                        trackedRoles.length > 0 && (look || tc._count.matches === 0) && (
                          <p className="text-xs leading-snug text-muted-foreground">
                            {look ? (
                              <>
                                <span className="font-semibold text-foreground">{look.matched} like yours</span> in{" "}
                                {OUTLOOK_DAYS} days{look.lastAt ? `, last ${agoShort(look.lastAt)}` : ""}
                              </>
                            ) : (
                              <>None like yours in {OUTLOOK_DAYS} days</>
                            )}
                          </p>
                        )
                      ) : (
                        <p className="label-caps pt-0.5 text-clay">Board not connected</p>
                      )}
                    </div>
                    <p className="col-start-3 font-mono text-xs tabular-nums text-muted-foreground sm:col-start-auto sm:text-right">
                      {visible ? (
                        <>
                          <span className="font-semibold text-foreground">{open.toLocaleString()}</span> open
                        </>
                      ) : (
                        "—"
                      )}
                    </p>
                  </Link>
                </RemovableRow>
              );
            })}
          </ol>
        </div>
      )}

      {tracked.length < 5 && collections.length > 0 && (
        <section className="space-y-3 pt-4">
          <div className="flex items-baseline justify-between gap-4">
            <h2 className="font-heading text-xl font-bold tracking-[-0.02em]">Borrow a list</h2>
            <Link href="/collections" className="inline-flex items-center gap-1 text-sm font-semibold hover:text-primary">
              All collections <ArrowRight className="size-3.5" />
            </Link>
          </div>
          <div className="grid grid-cols-1 gap-x-6 sm:grid-cols-3">
            {collections.map((col) => (
              <Link
                key={col.id}
                href={`/collections/${col.slug}`}
                className="group flex flex-col gap-3 border-t border-foreground py-4"
              >
                <div className="flex gap-1.5">
                  {col.companies.map(({ company }) => (
                    <CompanyLogo key={company.name} name={company.name} website={company.website} size="sm" />
                  ))}
                </div>
                <div>
                  <p className="font-heading text-base font-bold leading-snug group-hover:text-primary">{col.name}</p>
                  <p className="font-mono text-xs text-muted-foreground">{col._count.companies} companies</p>
                </div>
              </Link>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
