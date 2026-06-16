"use client";

import { useState, useTransition, useEffect, useRef } from "react";
import { X, Plus, ChevronDown } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { addTrackedRole, removeTrackedRole, saveUserPreferences } from "@/app/actions/roles";

const SENIORITY = [
  { label: "Junior", kw: "junior" },
  { label: "Mid", kw: "mid" },
  { label: "Senior", kw: "senior" },
  { label: "Staff", kw: "staff" },
  { label: "Lead", kw: "lead" },
];

// Common role titles for typeahead suggestions
const ROLE_SUGGESTIONS = [
  // Engineering
  "Software Engineer", "Senior Software Engineer", "Staff Software Engineer", "Principal Engineer",
  "Frontend Engineer", "Backend Engineer", "Full Stack Engineer", "Mobile Engineer",
  "iOS Engineer", "Android Engineer", "Platform Engineer", "Infrastructure Engineer",
  "DevOps Engineer", "Site Reliability Engineer", "Security Engineer", "Data Engineer",
  "Machine Learning Engineer", "AI Engineer", "ML Infrastructure Engineer", "Engineering Manager",
  "Director of Engineering", "VP of Engineering", "CTO",
  // Product
  "Product Manager", "Senior Product Manager", "Group Product Manager", "Principal Product Manager",
  "Director of Product", "VP of Product", "Chief Product Officer", "Technical Product Manager",
  "AI Product Manager", "Growth Product Manager",
  // Design
  "Product Designer", "Senior Product Designer", "UX Designer", "UI Designer",
  "Design Lead", "Head of Design", "Brand Designer", "Design Engineer",
  // Data
  "Data Scientist", "Senior Data Scientist", "Data Analyst", "Analytics Engineer",
  "Research Scientist", "Applied Scientist",
  // GTM / Sales
  "Account Executive", "Enterprise Account Executive", "Strategic Account Executive",
  "Sales Development Representative", "Solutions Engineer", "Sales Engineer",
  "Customer Success Manager", "Head of Sales", "VP of Sales",
  // Marketing
  "Product Marketing Manager", "Growth Marketer", "Content Marketer", "Demand Generation Manager",
  "Head of Marketing", "VP of Marketing", "Brand Marketing Manager",
  // Ops / Other
  "Chief of Staff", "Business Operations Manager", "Revenue Operations Manager",
  "Recruiter", "Technical Recruiter", "Developer Advocate", "Developer Relations",
  "Technical Writer",
];

const GEO_PRESETS = [
  { label: "🇺🇸 United States", value: "United States" },
  { label: "🗽 New York",        value: "New York" },
  { label: "🌉 San Francisco",   value: "San Francisco" },
  { label: "🇬🇧 London",         value: "London" },
  { label: "🇪🇺 Europe",         value: "Europe" },
];

type Role = { id: string; title: string };

export function TrackedRoles({
  initialRoles,
  trackedCount,
  initialSeniority,
  initialRemoteOnly,
  initialLocationFilter,
  showFilters = true,
}: {
  initialRoles: Role[];
  trackedCount: number;
  initialSeniority: string[];
  initialRemoteOnly: boolean | null;
  initialLocationFilter: string | null;
  showFilters?: boolean;
}) {
  const [roles, setRoles] = useState<Role[]>(initialRoles);

  // Instantly add a role when TrendingRoles dispatches the event (before router.refresh() lands)
  useEffect(() => {
    function handleRoleAdded(e: Event) {
      const role = (e as CustomEvent<Role>).detail;
      setRoles((prev) =>
        prev.some((r) => r.id === role.id) ? prev : [...prev, role]
      );
    }
    window.addEventListener("crush:roleAdded", handleRoleAdded);
    return () => window.removeEventListener("crush:roleAdded", handleRoleAdded);
  }, []);

  const [input, setInput] = useState("");
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [highlightIdx, setHighlightIdx] = useState(0);
  const inputWrapRef = useRef<HTMLDivElement>(null);
  const [seniority, setSeniority] = useState<string[]>(initialSeniority);
  const [remote, setRemote] = useState<"any" | "remote" | "onsite">(
    initialRemoteOnly === true ? "remote" : initialRemoteOnly === false ? "onsite" : "any"
  );
  const [location, setLocation] = useState(initialLocationFilter ?? "");
  const [isPending, startTransition] = useTransition();
  const [prefsSaved, setPrefsSaved] = useState(false);
  const [filtersOpen, setFiltersOpen] = useState(() => {
    if (typeof window === "undefined") return true;
    const saved = localStorage.getItem("crush:filtersOpen");
    return saved === null ? true : saved === "true";
  });

  function toggleFilters() {
    setFiltersOpen((v) => {
      const next = !v;
      localStorage.setItem("crush:filtersOpen", String(next));
      return next;
    });
  }

  // Filter suggestions on what's typed, excluding already-added roles
  const addedLower = new Set(roles.map((r) => r.title.toLowerCase()));
  const query = input.trim().toLowerCase();
  const suggestions = query.length > 0
    ? ROLE_SUGGESTIONS.filter(
        (s) => s.toLowerCase().includes(query) && !addedLower.has(s.toLowerCase())
      ).slice(0, 6)
    : [];

  // Close suggestions on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (inputWrapRef.current && !inputWrapRef.current.contains(e.target as Node)) {
        setShowSuggestions(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  function handleAdd(titleArg?: string) {
    const title = (titleArg ?? input).trim();
    if (!title || roles.some((r) => r.title.toLowerCase() === title.toLowerCase())) {
      setInput("");
      setShowSuggestions(false);
      return;
    }
    const optimisticId = `temp-${Date.now()}`;
    setRoles((prev) => [...prev, { id: optimisticId, title }]);
    setInput("");
    setShowSuggestions(false);
    setHighlightIdx(0);
    startTransition(async () => {
      await addTrackedRole(title);
    });
  }

  function handleRemove(id: string) {
    setRoles((prev) => prev.filter((r) => r.id !== id));
    startTransition(async () => {
      await removeTrackedRole(id);
    });
  }

  function handleSavePrefs() {
    startTransition(async () => {
      await saveUserPreferences({
        seniority,
        remoteOnly: remote === "remote" ? true : remote === "onsite" ? false : null,
        locationFilter: location.trim() || null,
      });
      setPrefsSaved(true);
      setTimeout(() => setPrefsSaved(false), 2000);
    });
  }

  const pillBase = "rounded-full px-3 py-1 text-xs font-medium border transition-colors cursor-pointer";
  const pillActive = "border-primary bg-primary text-primary-foreground";
  const pillInactive = "border-border text-muted-foreground hover:border-foreground/30 hover:text-foreground";

  return (
    <div className="space-y-6">
      {/* Role titles */}
      <div className="space-y-3">
        <div className="flex gap-2">
          <div ref={inputWrapRef} className="relative flex-1">
            <Input
              placeholder="e.g. GTM Engineer, Product Designer…"
              value={input}
              onChange={(e) => {
                setInput(e.target.value);
                setShowSuggestions(true);
                setHighlightIdx(0);
              }}
              onFocus={() => input.trim() && setShowSuggestions(true)}
              onKeyDown={(e) => {
                if (e.key === "ArrowDown" && suggestions.length > 0) {
                  e.preventDefault();
                  setShowSuggestions(true);
                  setHighlightIdx((i) => Math.min(i + 1, suggestions.length - 1));
                } else if (e.key === "ArrowUp" && suggestions.length > 0) {
                  e.preventDefault();
                  setHighlightIdx((i) => Math.max(i - 1, 0));
                } else if (e.key === "Enter" || e.key === ",") {
                  e.preventDefault();
                  if (showSuggestions && suggestions[highlightIdx]) {
                    handleAdd(suggestions[highlightIdx]);
                  } else {
                    handleAdd();
                  }
                } else if (e.key === "Escape") {
                  setShowSuggestions(false);
                }
              }}
              className="h-8 text-sm w-full"
            />
            {showSuggestions && suggestions.length > 0 && (
              <div className="absolute top-full left-0 right-0 mt-1 z-50 rounded-lg border border-border/60 bg-popover shadow-lg overflow-hidden">
                {suggestions.map((s, i) => (
                  <button
                    key={s}
                    type="button"
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => handleAdd(s)}
                    onMouseEnter={() => setHighlightIdx(i)}
                    className={`w-full text-left px-3 py-2 text-sm transition-colors ${
                      i === highlightIdx ? "bg-muted text-foreground" : "text-muted-foreground hover:bg-muted/50"
                    }`}
                  >
                    {s}
                  </button>
                ))}
              </div>
            )}
          </div>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => handleAdd()}
            disabled={isPending || !input.trim()}
            className="shrink-0"
          >
            <Plus className="size-3.5" />
            Add
          </Button>
        </div>

        {roles.length > 0 ? (
          <div className="flex flex-wrap gap-1.5">
            {roles.map((role) => (
              <span
                key={role.id}
                className="inline-flex items-center gap-1 rounded-full border border-primary/40 bg-primary/10 px-2.5 py-0.5 text-xs font-medium text-primary"
              >
                {role.title}
                <button
                  onClick={() => handleRemove(role.id)}
                  className="ml-0.5 rounded-full hover:text-primary/60 transition-colors"
                  aria-label={`Remove ${role.title}`}
                >
                  <X className="size-2.5" />
                </button>
              </span>
            ))}
          </div>
        ) : (
          <p className="text-xs text-muted-foreground">
            No roles yet. Add one above and we&apos;ll match it across all{" "}
            {trackedCount > 0 ? `your ${trackedCount} tracked` : "your tracked"}{" "}
            {trackedCount === 1 ? "company" : "companies"}.
          </p>
        )}
      </div>

      {/* Filters: collapsible — only shown in settings */}
      {showFilters && <div className="border rounded-lg overflow-hidden">
        <button
          type="button"
          onClick={toggleFilters}
          className="w-full flex items-center justify-between px-3 py-2 text-xs font-medium text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors"
        >
          <span>Filters — seniority, location &amp; work arrangement</span>
          <ChevronDown className={`size-3.5 transition-transform ${filtersOpen ? "rotate-180" : ""}`} />
        </button>

        {filtersOpen && (
          <div className="px-3 pb-3 space-y-4 border-t pt-3">
            {/* Seniority */}
            <div className="space-y-2">
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Seniority</p>
              <div className="flex flex-wrap gap-1.5">
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
              <p className="text-xs text-muted-foreground">Leave empty to match any seniority level.</p>
            </div>

            {/* Geography */}
            <div className="space-y-2">
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Geography</p>
              <div className="flex flex-wrap gap-1.5">
                <button
                  type="button"
                  onClick={() => setLocation("")}
                  className={`${pillBase} ${!location ? pillActive : pillInactive}`}
                >
                  Anywhere
                </button>
                {GEO_PRESETS.map(({ label, value }) => (
                  <button
                    key={value}
                    type="button"
                    onClick={() => setLocation(location === value ? "" : value)}
                    className={`${pillBase} ${location === value ? pillActive : pillInactive}`}
                  >
                    {label}
                  </button>
                ))}
              </div>
              <Input
                placeholder="Or type a city, state, or country…"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                className="h-8 text-sm max-w-xs"
              />
              <p className="text-xs text-muted-foreground">
                Filters both on-site and remote jobs by location. Leave empty for anywhere.
              </p>
            </div>

            {/* Work arrangement */}
            <div className="space-y-2">
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Work arrangement</p>
              <div className="flex gap-1.5">
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
            </div>

            <Button size="sm" variant="outline" onClick={handleSavePrefs} disabled={isPending}>
              {prefsSaved ? "Saved!" : isPending ? "Saving…" : "Save preferences"}
            </Button>
          </div>
        )}
      </div>}
    </div>
  );
}
