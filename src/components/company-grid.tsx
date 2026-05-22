"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Search, Building2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TrackButton } from "@/components/track-button";

type Company = {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  industry: string | null;
  headquarters: string | null;
  logoUrl: string | null;
  _count: { jobs: number };
};

export function CompanyGrid({
  companies,
  trackedMap,
  industries,
  initialQ,
  initialIndustry,
}: {
  companies: Company[];
  trackedMap: Map<string, string>;
  industries: string[];
  initialQ: string;
  initialIndustry: string;
}) {
  const router = useRouter();
  const [q, setQ] = useState(initialQ);
  const [industry, setIndustry] = useState(initialIndustry);
  const [, startTransition] = useTransition();

  function applyFilters(newQ: string, newIndustry: string) {
    const params = new URLSearchParams();
    if (newQ) params.set("q", newQ);
    if (newIndustry) params.set("industry", newIndustry);
    startTransition(() => {
      router.push(`/companies?${params.toString()}`);
    });
  }

  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground" />
          <Input
            placeholder="Search companies…"
            className="pl-8"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && applyFilters(q, industry)}
          />
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => applyFilters(q, industry)}
        >
          Search
        </Button>
      </div>

      {industries.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          <button
            onClick={() => {
              setIndustry("");
              applyFilters(q, "");
            }}
          >
            <Badge
              variant={industry === "" ? "default" : "outline"}
              className="cursor-pointer"
            >
              All
            </Badge>
          </button>
          {industries.map((ind) => (
            <button
              key={ind}
              onClick={() => {
                const next = industry === ind ? "" : ind;
                setIndustry(next);
                applyFilters(q, next);
              }}
            >
              <Badge
                variant={industry === ind ? "default" : "outline"}
                className="cursor-pointer"
              >
                {ind}
              </Badge>
            </button>
          ))}
        </div>
      )}

      {companies.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 gap-2 text-center">
          <Building2 className="size-10 text-muted-foreground/40" />
          <p className="text-sm text-muted-foreground">No companies found</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 md:grid-cols-3">
          {companies.map((company) => {
            const trackedId = trackedMap.get(company.id);
            return (
              <Card key={company.id} className="flex flex-col">
                <CardHeader className="pb-2">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <Link href={`/companies/${company.slug}`}>
                        <CardTitle className="hover:underline truncate">
                          {company.name}
                        </CardTitle>
                      </Link>
                      {company.industry && (
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {company.industry}
                        </p>
                      )}
                    </div>
                    <TrackButton
                      companyId={company.id}
                      trackedId={trackedId}
                    />
                  </div>
                </CardHeader>
                {company.description && (
                  <CardContent>
                    <p className="text-xs text-muted-foreground line-clamp-2">
                      {company.description}
                    </p>
                  </CardContent>
                )}
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
