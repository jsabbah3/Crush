"use client";

import { useState, useTransition, useEffect } from "react";
import { Check, X, ArrowRight, Link2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { CompanyLogo } from "@/components/company-logo";
import { saveOnboarding } from "@/app/actions/onboarding";
import { analytics } from "@/lib/analytics";
import { getRoleSuggestions, normalizeLinkedinUrl } from "@/lib/role-suggestions";

const SENIORITY = [
  { label: "Junior", kw: "junior" },
  { label: "Mid", kw: "mid" },
  { label: "Senior", kw: "senior" },
  { label: "Staff", kw: "staff" },
  { label: "Lead", kw: "lead" },
];

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
  const [step, setStep] = useState<1 | 2 | 3 | 4>(1);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    analytics.track("onboarding_screen_viewed", { screen_number: step });
  }, [step]);

  // Step 1 state — LinkedIn profile
  const [linkedinInput, setLinkedinInput] = useState("");
  const [currentTitleInput, setCurrentTitleInput] = useState("");

  // Step 2 state — roles & preferences
  const [roleInput, setRoleInput] = useState("");
  const [roles, setRoles] = useState<string[]>([]);
  const [seniority, setSeniority] = useState<string[]>([]);
  const [remote, setRemote] = useState<"any" | "remote" | "onsite">("any");
  const [location, setLocation] = useState("");

  // Step 3 state — collection
  const [selectedCollection, setSelectedCollection] = useState<string | null>(null);

  // Derived: suggestions from current title
  const suggestions = getRoleSuggestions(currentTitleInput, 6);

  function addRole(title: string) {
    const normalized = title.trim();
    if (normalized && !roles.some((r) => r.toLowerCase() === normalized.toLowerCase())) {
      setRoles((p) => [...p, normalized]);
    }
    setRoleInput("");
  }

  function handleFinish(collectionSlug: string | null) {
    analytics.track("onboarding_completed", {
      role_count: roles.length,
      collection_slug: collectionSlug ?? undefined,
      has_linkedin: !!linkedinInput.trim(),
    });
    if (collectionSlug) {
      analytics.track("first_collection_followed", { collection_slug: collectionSlug });
    }
    const linkedinUrl = normalizeLinkedinUrl(linkedinInput) ?? null;
    const currentTitle = currentTitleInput.trim() || null;
    startTransition(async () => {
      await saveOnboarding(
        {
          roles,
          seniority,
          remoteOnly: remote === "remote" ? true : remote === "onsite" ? false : null,
          locationFilter: remote === "onsite" && location.trim() ? location.trim() : null,
          linkedinUrl,
          currentTitle,
        },
        collectionSlug
      );
    });
  }

  const pillBase = "rounded-full px-4 py-1.5 text-sm font-medium border transition-colors";
  const pillActive = "border-primary bg-primary text-primary-foreground";
  const pillInactive = "border-border bg-background text-muted-foreground hover:border-foreground/30 hover:text-foreground";

  // ─── Step 1: LinkedIn ───────────────────────────────────────────────────────
  if (step === 1) {
    return (
      <div className="space-y-8">
        <div className="space-y-1.5">
          <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
            Step 1 of 4
          </p>
          <h1 className="text-2xl font-bold">Let&apos;s personalize your experience</h1>
          <p className="text-sm text-muted-foreground">
            We&apos;ll use this to suggest relevant roles for you to track. Both fields are optional.
          </p>
        </div>

        <div className="space-y-5">
          {/* LinkedIn URL */}
          <div className="space-y-2">
            <label className="text-sm font-medium flex items-center gap-1.5">
              <Link2 className="size-3.5 text-muted-foreground" />
              LinkedIn profile URL
            </label>
            <Input
              type="url"
              placeholder="https://linkedin.com/in/yourname"
              value={linkedinInput}
              onChange={(e) => setLinkedinInput(e.target.value)}
              className="max-w-sm"
            />
            <p className="text-xs text-muted-foreground">
              We store this for future personalization — we don&apos;t scrape or share it.
            </p>
          </div>

          {/* Current role */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Your current role title</label>
            <Input
              placeholder="e.g. Senior Software Engineer, Product Manager…"
              value={currentTitleInput}
              onChange={(e) => setCurrentTitleInput(e.target.value)}
              className="max-w-sm"
            />
            {currentTitleInput.trim() && (
              <div className="space-y-1.5 pt-1">
                <p className="text-xs text-muted-foreground">
                  People in this role often track:
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {suggestions.map((s) => (
                    <span
                      key={s}
                      className="text-xs px-2.5 py-1 rounded-full border border-border bg-muted/50 text-muted-foreground"
                    >
                      {s}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="flex items-center justify-between pt-2">
          <button
            type="button"
            onClick={() => setStep(2)}
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

  // ─── Step 2: Roles & preferences ───────────────────────────────────────────
  if (step === 2) {
    const hasSuggestions = currentTitleInput.trim().length > 0;

    return (
      <div className="space-y-8">
        <div className="space-y-1.5">
          <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
            Step 2 of 4
          </p>
          <h1 className="text-2xl font-bold">What roles are you looking for?</h1>
          <p className="text-sm text-muted-foreground">
            These apply across every company you track — no need to set criteria per company.
          </p>
        </div>

        <div className="space-y-6">
          {/* Suggested roles — only shown if they gave a current title */}
          {hasSuggestions && (
            <div className="space-y-2">
              <p className="text-sm font-medium">
                Suggested for you
                <span className="ml-2 text-xs font-normal text-muted-foreground">
                  based on your role as {currentTitleInput.trim()}
                </span>
              </p>
              <div className="flex flex-wrap gap-1.5">
                {suggestions.map((s) => {
                  const already = roles.some((r) => r.toLowerCase() === s.toLowerCase());
                  return (
                    <button
                      key={s}
                      type="button"
                      onClick={() => already
                        ? setRoles((p) => p.filter((r) => r.toLowerCase() !== s.toLowerCase()))
                        : addRole(s)
                      }
                      className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-xs font-medium transition-colors ${
                        already
                          ? "border-primary/40 bg-primary/10 text-primary"
                          : "border-border bg-background text-muted-foreground hover:border-foreground/30 hover:text-foreground"
                      }`}
                    >
                      {already ? <Check className="size-3" /> : null}
                      {s}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Role titles */}
          <div className="space-y-2">
            <p className="text-sm font-medium">
              {hasSuggestions ? "Or add your own" : "Role titles"}
            </p>
            <p className="text-xs text-muted-foreground">
              Be specific or broad — e.g. &ldquo;GTM Engineer&rdquo;, &ldquo;Product Designer&rdquo;, &ldquo;Engineer&rdquo;
            </p>
            <div className="flex gap-2">
              <Input
                placeholder="Add a role title…"
                value={roleInput}
                onChange={(e) => setRoleInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === ",") {
                    e.preventDefault();
                    addRole(roleInput);
                  }
                }}
                className="max-w-xs"
              />
              <Button type="button" variant="outline" size="sm" onClick={() => addRole(roleInput)}>
                Add
              </Button>
            </div>
            {roles.length > 0 && (
              <div className="flex flex-wrap gap-1.5">
                {roles.map((role) => (
                  <Badge key={role} variant="secondary" className="gap-1 pl-2.5 pr-1.5">
                    {role}
                    <button
                      onClick={() => setRoles((p) => p.filter((r) => r !== role))}
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
            <p className="text-xs text-muted-foreground">Leave blank to match any level.</p>
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
                    className={`${pillBase} ${active ? pillActive : pillInactive}`}
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
                    className={`${pillBase} ${remote === val ? pillActive : pillInactive}`}
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
            onClick={() => setStep(1)}
            className="text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            Back
          </button>
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setStep(3)}
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

  // ─── Step 3: Collection ─────────────────────────────────────────────────────
  if (step === 3) {
    return (
      <div className="space-y-8">
        <div className="space-y-1.5">
          <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
            Step 3 of 4
          </p>
          <h1 className="text-2xl font-bold">Pick a collection to start tracking</h1>
          <p className="text-sm text-muted-foreground">
            We&apos;ll start watching all companies in your chosen collection. You can always add more later.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {collections.map((col) => {
            const selected = selectedCollection === col.slug;
            return (
              <button
                key={col.id}
                type="button"
                onClick={() => setSelectedCollection(selected ? null : col.slug)}
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
            onClick={() => setStep(2)}
            className="text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            Back
          </button>
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setStep(4)}
              className="text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              Skip this step
            </button>
            <Button onClick={() => setStep(4)}>
              Continue <ArrowRight className="size-4" />
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // ─── Step 4: Confirm ────────────────────────────────────────────────────────
  const chosenCollection = collections.find((c) => c.slug === selectedCollection);

  return (
    <div className="space-y-8">
      <div className="space-y-1.5">
        <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
          Step 4 of 4
        </p>
        <h1 className="text-2xl font-bold">You&apos;re all set.</h1>
        <p className="text-sm text-muted-foreground">
          Here&apos;s what we&apos;re setting up for you.
        </p>
      </div>

      <div className="rounded-xl border bg-card p-5 space-y-4">
        {currentTitleInput.trim() && (
          <div className="space-y-1 pb-3 border-b">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Your current role
            </p>
            <p className="text-sm">{currentTitleInput.trim()}</p>
          </div>
        )}

        <div className="space-y-2">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Roles you&apos;re tracking
          </p>
          {roles.length > 0 ? (
            <div className="flex flex-wrap gap-1.5">
              {roles.map((r) => (
                <Badge key={r} variant="secondary">{r}</Badge>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">Any role (no filter set)</p>
          )}
          {seniority.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mt-1">
              {seniority.map((s) => (
                <Badge key={s} variant="outline" className="capitalize">{s}</Badge>
              ))}
            </div>
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
              We&apos;ll watch {chosenCollection._count.companies} companies and email you the moment a matching role opens.
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
          onClick={() => setStep(3)}
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
