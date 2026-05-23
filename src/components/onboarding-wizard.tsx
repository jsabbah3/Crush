"use client";

import { useState, useTransition, useEffect } from "react";
import { Check, X, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { CompanyLogo } from "@/components/company-logo";
import { saveOnboarding } from "@/app/actions/onboarding";
import { analytics } from "@/lib/analytics";
import type { JobType } from "@/generated/prisma/enums";

const SENIORITY = [
  { label: "Junior", kw: "junior" },
  { label: "Mid", kw: "mid" },
  { label: "Senior", kw: "senior" },
  { label: "Staff", kw: "staff" },
  { label: "Lead", kw: "lead" },
];
const SENIORITY_KWS = new Set(SENIORITY.map((s) => s.kw));

type Collection = {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  companies: { company: { name: string; website: string | null } }[];
  _count: { companies: number };
};

type Props = {
  collections: Collection[];
};

export function OnboardingWizard({ collections }: Props) {
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [isPending, startTransition] = useTransition();

  // Fire screen view on mount and on step changes
  useEffect(() => {
    analytics.track("onboarding_screen_viewed", { screen_number: step });
  }, [step]);

  // Step 1 state
  const [kwInput, setKwInput] = useState("");
  const [keywords, setKeywords] = useState<string[]>([]);
  const [seniority, setSeniority] = useState<string[]>([]);
  const [remote, setRemote] = useState<"any" | "remote" | "onsite">("any");
  const [location, setLocation] = useState("");

  // Step 2 state
  const [selectedCollection, setSelectedCollection] = useState<string | null>(null);

  function addKeyword() {
    const kw = kwInput.trim().toLowerCase();
    if (kw && !keywords.includes(kw) && !SENIORITY_KWS.has(kw)) {
      setKeywords((p) => [...p, kw]);
    }
    setKwInput("");
  }

  const allKeywords = [...keywords, ...seniority];
  const criteria = {
    keywords: allKeywords,
    jobTypes: [] as JobType[],
    remoteOnly: remote === "remote" ? true : remote === "onsite" ? false : null,
    locationFilter: remote === "onsite" && location.trim() ? location.trim() : null,
  };

  function handleFinish(collectionSlug: string | null) {
    analytics.track("onboarding_completed", {
      keyword_count: allKeywords.length,
      collection_slug: collectionSlug ?? undefined,
    });
    if (collectionSlug) {
      analytics.track("first_collection_followed", { collection_slug: collectionSlug });
    }
    startTransition(async () => {
      await saveOnboarding(criteria, collectionSlug);
    });
  }

  if (step === 1) {
    return (
      <div className="space-y-8">
        <div className="space-y-1.5">
          <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
            Step 1 of 3
          </p>
          <h1 className="text-2xl font-bold">What roles are you looking for?</h1>
          <p className="text-sm text-muted-foreground">
            We'll use this to filter alerts across every company you track.
          </p>
        </div>

        <div className="space-y-6">
          {/* Keywords */}
          <div className="space-y-2">
            <p className="text-sm font-medium">Job title keywords</p>
            <p className="text-xs text-muted-foreground">e.g. "engineer", "product manager", "designer"</p>
            <div className="flex gap-2">
              <Input
                placeholder="Add a keyword…"
                value={kwInput}
                onChange={(e) => setKwInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === ",") {
                    e.preventDefault();
                    addKeyword();
                  }
                }}
                className="max-w-xs"
              />
              <Button type="button" variant="outline" size="sm" onClick={addKeyword}>
                Add
              </Button>
            </div>
            {keywords.length > 0 && (
              <div className="flex flex-wrap gap-1.5">
                {keywords.map((kw) => (
                  <Badge key={kw} variant="secondary" className="gap-1 pl-2.5 pr-1.5">
                    {kw}
                    <button
                      onClick={() => setKeywords((p) => p.filter((k) => k !== kw))}
                      className="rounded hover:text-foreground transition-colors"
                    >
                      <X className="size-3" />
                    </button>
                  </Badge>
                ))}
              </div>
            )}
          </div>

          {/* Seniority */}
          <div className="space-y-2">
            <p className="text-sm font-medium">Seniority level</p>
            <div className="flex flex-wrap gap-2">
              {SENIORITY.map(({ label, kw }) => {
                const active = seniority.includes(kw);
                return (
                  <button
                    key={kw}
                    type="button"
                    onClick={() =>
                      setSeniority((p) =>
                        p.includes(kw) ? p.filter((k) => k !== kw) : [...p, kw]
                      )
                    }
                    className={`rounded-full px-4 py-1.5 text-sm font-medium border transition-colors ${
                      active
                        ? "border-primary bg-primary text-primary-foreground"
                        : "border-border bg-background text-muted-foreground hover:border-foreground/30 hover:text-foreground"
                    }`}
                  >
                    {label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Work arrangement */}
          <div className="space-y-2">
            <p className="text-sm font-medium">Work arrangement</p>
            <div className="flex gap-2">
              {(["any", "remote", "onsite"] as const).map((val) => {
                const label = val === "any" ? "Any" : val === "remote" ? "Remote" : "On-site";
                return (
                  <button
                    key={val}
                    type="button"
                    onClick={() => setRemote(val)}
                    className={`rounded-full px-4 py-1.5 text-sm font-medium border transition-colors ${
                      remote === val
                        ? "border-primary bg-primary text-primary-foreground"
                        : "border-border bg-background text-muted-foreground hover:border-foreground/30 hover:text-foreground"
                    }`}
                  >
                    {label}
                  </button>
                );
              })}
            </div>
            {remote === "onsite" && (
              <Input
                placeholder="City or region (e.g. New York, London)"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                className="max-w-xs mt-1.5"
              />
            )}
          </div>
        </div>

        <div className="flex items-center justify-between pt-2">
          <button
            type="button"
            onClick={() => { analytics.track("onboarding_completed", { skipped_at_screen: 1 }); setStep(2); }}
            className="text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            Skip this step
          </button>
          <Button onClick={() => setStep(2)}>
            Continue <ArrowRight className="size-4" />
          </Button>
        </div>
      </div>
    );
  }

  if (step === 2) {
    return (
      <div className="space-y-8">
        <div className="space-y-1.5">
          <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
            Step 2 of 3
          </p>
          <h1 className="text-2xl font-bold">Pick a collection to start tracking</h1>
          <p className="text-sm text-muted-foreground">
            We'll start watching all companies in your chosen collection. You can always add more later.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {collections.map((col) => {
            const selected = selectedCollection === col.slug;
            return (
              <button
                key={col.id}
                type="button"
                onClick={() =>
                  setSelectedCollection(selected ? null : col.slug)
                }
                className={`text-left flex flex-col gap-3 rounded-xl border p-4 transition-all ${
                  selected
                    ? "border-primary bg-primary/5 ring-1 ring-primary"
                    : "border-border bg-card hover:border-foreground/20 hover:shadow-sm"
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex -space-x-1.5">
                    {col.companies.slice(0, 4).map(({ company }, i) => (
                      <div
                        key={i}
                        className="ring-2 ring-background rounded-lg"
                        style={{ zIndex: 4 - i }}
                      >
                        <CompanyLogo name={company.name} website={company.website} size="sm" />
                      </div>
                    ))}
                  </div>
                  {selected && (
                    <div className="shrink-0 size-5 rounded-full bg-primary flex items-center justify-center">
                      <Check className="size-3 text-primary-foreground" />
                    </div>
                  )}
                </div>
                <div>
                  <p className="font-semibold text-sm">{col.name}</p>
                  {col.description && (
                    <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">
                      {col.description}
                    </p>
                  )}
                  <p className="text-xs text-muted-foreground mt-1">
                    {col._count.companies} companies
                  </p>
                </div>
              </button>
            );
          })}
        </div>

        <div className="flex items-center justify-between pt-2">
          <button
            type="button"
            onClick={() => setStep(1)}
            className="text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            Back
          </button>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => { analytics.track("onboarding_completed", { skipped_at_screen: 2 }); setStep(3); }}
              className="text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              Skip this step
            </button>
            <Button onClick={() => setStep(3)}>
              Continue <ArrowRight className="size-4" />
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // Step 3 — confirmation
  const chosenCollection = collections.find((c) => c.slug === selectedCollection);

  return (
    <div className="space-y-8">
      <div className="space-y-1.5">
        <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
          Step 3 of 3
        </p>
        <h1 className="text-2xl font-bold">You're all set.</h1>
        <p className="text-sm text-muted-foreground">
          Here's what we're setting up for you.
        </p>
      </div>

      <div className="rounded-xl border bg-card p-5 space-y-4">
        <div className="space-y-2">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Your criteria
          </p>
          {allKeywords.length > 0 ? (
            <div className="flex flex-wrap gap-1.5">
              {allKeywords.map((kw) => (
                <Badge key={kw} variant="secondary">{kw}</Badge>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">Any role (no keyword filter)</p>
          )}
          <p className="text-sm text-muted-foreground">
            {remote === "remote"
              ? "Remote only"
              : remote === "onsite"
              ? `On-site${location ? ` · ${location}` : ""}`
              : "Any work arrangement"}
          </p>
        </div>

        {chosenCollection ? (
          <div className="space-y-1.5 pt-2 border-t">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Starting collection
            </p>
            <p className="text-sm font-medium">{chosenCollection.name}</p>
            <p className="text-xs text-muted-foreground">
              We'll watch {chosenCollection._count.companies} companies and email you the moment a matching role opens.
            </p>
          </div>
        ) : (
          <div className="space-y-1 pt-2 border-t">
            <p className="text-sm text-muted-foreground">
              No collection selected. Browse companies and follow any you want to track.
            </p>
          </div>
        )}
      </div>

      <div className="flex items-center justify-between pt-2">
        <button
          type="button"
          onClick={() => setStep(2)}
          className="text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          Back
        </button>
        <Button
          onClick={() => handleFinish(selectedCollection)}
          disabled={isPending}
          size="lg"
        >
          {isPending ? "Setting up…" : "Go to dashboard"}
          {!isPending && <ArrowRight className="size-4" />}
        </Button>
      </div>
    </div>
  );
}
