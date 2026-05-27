"use client";

import { useState, useTransition } from "react";
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
}: {
  initialRoles: Role[];
  trackedCount: number;
  initialSeniority: string[];
  initialRemoteOnly: boolean | null;
  initialLocationFilter: string | null;
}) {
  const [roles, setRoles] = useState<Role[]>(initialRoles);
  const [input, setInput] = useState("");
  const [seniority, setSeniority] = useState<string[]>(initialSeniority);
  const [remote, setRemote] = useState<"any" | "remote" | "onsite">(
    initialRemoteOnly === true ? "remote" : initialRemoteOnly === false ? "onsite" : "any"
  );
  const [location, setLocation] = useState(initialLocationFilter ?? "");
  const [isPending, startTransition] = useTransition();
  const [prefsSaved, setPrefsSaved] = useState(false);
  const [filtersOpen, setFiltersOpen] = useState(true);

  function handleAdd() {
    const title = input.trim();
    if (!title || roles.some((r) => r.title.toLowerCase() === title.toLowerCase())) {
      setInput("");
      return;
    }
    const optimisticId = `temp-${Date.now()}`;
    setRoles((prev) => [...prev, { id: optimisticId, title }]);
    setInput("");
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
          <Input
            placeholder="e.g. GTM Engineer, Product Designer…"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === ",") {
                e.preventDefault();
                handleAdd();
              }
            }}
            className="h-8 text-sm"
          />
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleAdd}
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

      {/* Filters: collapsible */}
      <div className="border rounded-lg overflow-hidden">
        <button
          type="button"
          onClick={() => setFiltersOpen((v) => !v)}
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
      </div>
    </div>
  );
}
