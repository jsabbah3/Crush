import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { CompanyLogo } from "@/components/company-logo";
import { listedCollections } from "@/lib/collections";

export const metadata = {
  title: "Collections — Crush",
  description: "Curated lists of companies grouped by theme to help you discover where to apply.",
};

export default async function CollectionsPage() {
  const collections = await prisma.collection.findMany({
      where: listedCollections,
    include: {
      companies: {
        include: { company: { select: { name: true, website: true } } },
        orderBy: { displayOrder: "asc" },
      },
    },
    orderBy: { createdAt: "asc" },
  });

  return (
    <div className="space-y-8">
      <div className="space-y-1">
        <h1 className="font-heading text-[2rem] font-extrabold leading-[1.05] tracking-[-0.02em] sm:text-[2.5rem]">Collections</h1>
        <p className="text-sm text-muted-foreground">
          Hand-picked bundles of companies. Follow a whole one in a click, then cross off the ones you wouldn&apos;t really leave for.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {collections.map((col) => {
          const preview = col.companies.slice(0, 5);
          return (
            <Link
              key={col.id}
              href={`/collections/${col.slug}`}
              className="group rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/60"
            >
              <div className="flex h-full flex-col gap-4 border border-border bg-card p-5 transition-[border-color,box-shadow,transform] duration-200 ease-[var(--ease-settle)] hover:-translate-x-0.5 hover:-translate-y-0.5 hover:border-foreground hover:shadow-[4px_4px_0_-1px_var(--foreground)]">
                {/* Logo stack */}
                <div className="flex gap-1.5">
                  {preview.map(({ company }, i) => (
                    <div
                      key={i}
                      className=""
                      style={{ zIndex: preview.length - i }}
                    >
                      <CompanyLogo name={company.name} website={company.website} size="sm" />
                    </div>
                  ))}
                  {col.companies.length > 5 && (
                    <div
                      className="size-8 bg-muted flex items-center justify-center font-mono text-xs text-muted-foreground font-medium tabular-nums"
                      style={{ zIndex: 0 }}
                    >
                      +{col.companies.length - 5}
                    </div>
                  )}
                </div>

                {/* Text */}
                <div className="flex-1 space-y-1">
                  <p className="font-heading text-lg font-bold leading-snug tracking-[-0.01em] group-hover:text-primary transition-colors">
                    {col.name}
                  </p>
                  {col.description && (
                    <p className="text-xs text-muted-foreground leading-relaxed line-clamp-2">
                      {col.description}
                    </p>
                  )}
                </div>

                {/* Footer */}
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <span className="font-mono tabular-nums">{col.companies.length} companies</span>
                  <ArrowRight className="size-3.5 group-hover:translate-x-0.5 transition-transform duration-[var(--dur-fast)]" />
                </div>
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
