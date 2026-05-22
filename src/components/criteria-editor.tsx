"use client";

import { useState, useTransition } from "react";
import { X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { updateCriteria } from "@/app/actions/tracking";
import type { JobType } from "@/generated/prisma/enums";

type TrackedCompany = {
  id: string;
  keywords: string[];
  jobTypes: JobType[];
  remoteOnly: boolean | null;
  locationFilter: string | null;
  emailAlerts: boolean;
};

const JOB_TYPES: { value: JobType; label: string }[] = [
  { value: "FULL_TIME", label: "Full-time" },
  { value: "PART_TIME", label: "Part-time" },
  { value: "CONTRACT", label: "Contract" },
  { value: "INTERNSHIP", label: "Internship" },
  { value: "FREELANCE", label: "Freelance" },
];

export function CriteriaEditor({ tracked }: { tracked: TrackedCompany }) {
  const [keywords, setKeywords] = useState<string[]>(tracked.keywords);
  const [keywordInput, setKeywordInput] = useState("");
  const [jobTypes, setJobTypes] = useState<JobType[]>(tracked.jobTypes);
  const [remoteOnly, setRemoteOnly] = useState<boolean | null>(tracked.remoteOnly);
  const [locationFilter, setLocationFilter] = useState(tracked.locationFilter ?? "");
  const [emailAlerts, setEmailAlerts] = useState(tracked.emailAlerts);
  const [isPending, startTransition] = useTransition();
  const [saved, setSaved] = useState(false);

  function addKeyword() {
    const kw = keywordInput.trim().toLowerCase();
    if (kw && !keywords.includes(kw)) {
      setKeywords((prev) => [...prev, kw]);
    }
    setKeywordInput("");
  }

  function removeKeyword(kw: string) {
    setKeywords((prev) => prev.filter((k) => k !== kw));
  }

  function toggleJobType(type: JobType) {
    setJobTypes((prev) =>
      prev.includes(type) ? prev.filter((t) => t !== type) : [...prev, type]
    );
  }

  function handleRemoteChange(value: string) {
    setRemoteOnly(value === "remote" ? true : value === "onsite" ? false : null);
  }

  function handleSave() {
    startTransition(async () => {
      await updateCriteria(tracked.id, {
        keywords,
        jobTypes,
        remoteOnly,
        locationFilter: locationFilter.trim() || null,
        emailAlerts,
      });
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    });
  }

  return (
    <div className="space-y-5">
      <div className="space-y-2">
        <Label>Keywords</Label>
        <p className="text-xs text-muted-foreground">Match against job title and description</p>
        <div className="flex gap-2">
          <Input
            placeholder="e.g. frontend, react"
            value={keywordInput}
            onChange={(e) => setKeywordInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addKeyword())}
            className="max-w-xs"
          />
          <Button type="button" variant="outline" size="sm" onClick={addKeyword}>
            Add
          </Button>
        </div>
        {keywords.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {keywords.map((kw) => (
              <Badge key={kw} variant="secondary" className="gap-1">
                {kw}
                <button onClick={() => removeKeyword(kw)} className="hover:text-foreground">
                  <X className="size-3" />
                </button>
              </Badge>
            ))}
          </div>
        )}
      </div>

      <div className="space-y-2">
        <Label>Job types</Label>
        <div className="flex flex-wrap gap-x-4 gap-y-2">
          {JOB_TYPES.map(({ value, label }) => (
            <div key={value} className="flex items-center gap-2">
              <Checkbox
                id={value}
                checked={jobTypes.includes(value)}
                onCheckedChange={() => toggleJobType(value)}
              />
              <label htmlFor={value} className="text-sm cursor-pointer">
                {label}
              </label>
            </div>
          ))}
        </div>
      </div>

      <div className="space-y-2">
        <Label>Location preference</Label>
        <div className="flex flex-wrap gap-x-4 gap-y-2">
          {[
            { value: "any", label: "Any" },
            { value: "remote", label: "Remote only" },
            { value: "onsite", label: "On-site only" },
          ].map(({ value, label }) => (
            <div key={value} className="flex items-center gap-2">
              <input
                type="radio"
                id={`remote-${value}`}
                name="remote"
                value={value}
                checked={
                  value === "remote"
                    ? remoteOnly === true
                    : value === "onsite"
                    ? remoteOnly === false
                    : remoteOnly === null
                }
                onChange={() => handleRemoteChange(value)}
                className="accent-primary"
              />
              <label htmlFor={`remote-${value}`} className="text-sm cursor-pointer">
                {label}
              </label>
            </div>
          ))}
        </div>
        {remoteOnly === false && (
          <Input
            placeholder="City or region (e.g. San Francisco)"
            value={locationFilter}
            onChange={(e) => setLocationFilter(e.target.value)}
            className="max-w-xs mt-2"
          />
        )}
      </div>

      <div className="flex items-center gap-3">
        <Switch
          id="email-alerts"
          checked={emailAlerts}
          onCheckedChange={setEmailAlerts}
        />
        <Label htmlFor="email-alerts">Email alerts</Label>
      </div>

      <Button size="sm" onClick={handleSave} disabled={isPending}>
        {saved ? "Saved!" : isPending ? "Saving…" : "Save criteria"}
      </Button>
    </div>
  );
}
