import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { CompanyLogo } from "@/components/company-logo";

export const metadata = {
  title: "Collections — Crush",
  description: "Curated lists of companies grouped by theme to help you discover where to apply.",
};

export default async function CollectionsPage() {
  const collections = await prisma.collection.findMany({
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
        <h1 className="font-heading text-3xl font-bold">📚 Collections</h1>
        <p className="text-sm text-muted-foreground">
          Curated company lists to help you discover where to apply.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {collections.map((col) => {
          const preview = col.companies.slice(0, 5);
          return (
            <Link key={col.id} href={`/collections/${col.slug}`} className="group">
              <div className="flex flex-col gap-4 rounded-xl border bg-card p-5 transition-shadow hover:shadow-sm h-full">
                {/* Logo stack */}
                <div className="flex -space-x-2">
                  {preview.map(({ company }, i) => (
                    <div
                      key={i}
                      className="ring-2 ring-background rounded-xl"
                      style={{ zIndex: preview.length - i }}
                    >
                      <CompanyLogo name={company.name} website={company.website} size="sm" />
                    </div>
                  ))}
                  {col.companies.length > 5 && (
                    <div
                      className="ring-2 ring-background size-8 rounded-xl bg-muted flex items-center justify-center text-xs text-muted-foreground font-medium"
                      style={{ zIndex: 0 }}
                    >
                      +{col.companies.length - 5}
                    </div>
                  )}
                </div>

                {/* Text */}
                <div className="flex-1 space-y-1">
                  <p className="font-semibold text-sm leading-snug group-hover:text-primary transition-colors">
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
                  <span>{col.companies.length} companies</span>
                  <ArrowRight className="size-3.5 group-hover:translate-x-0.5 transition-transform" />
                </div>
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
