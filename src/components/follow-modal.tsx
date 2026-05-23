"use client";

import { useState, useTransition } from "react";
import { X } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { followCompany, updateCriteria, untrackCompany } from "@/app/actions/tracking";
import type { JobType } from "@/generated/prisma/enums";

// Seniority options stored as keywords so they work with existing matching logic
const SENIORITY = [
  { label: "Junior", kw: "junior" },
  { label: "Mid", kw: "mid" },
  { label: "Senior", kw: "senior" },
  { label: "Staff", kw: "staff" },
  { label: "Lead", kw: "lead" },
];
const SENIORITY_KWS = new Set(SENIORITY.map((s) => s.kw));

type Existing = {
  id: string;
  keywords: string[];
  jobTypes: JobType[];
  remoteOnly: boolean | null;
  locationFilter: string | null;
  emailAlerts: boolean;
};

type DefaultCriteria = {
  keywords: string[];
  remoteOnly: boolean | null;
  locationFilter: string | null;
};

type Props = {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  company: { id: string; name: string };
  existing?: Existing;
  defaultCriteria?: DefaultCriteria | null;
};

export function FollowModal({ open, onOpenChange, company, existing, defaultCriteria }: Props) {
  const seed = existing ?? defaultCriteria;
  const baseKeywords = (seed?.keywords ?? []).filter((k) => !SENIORITY_KWS.has(k));
  const baseSeniority = (seed?.keywords ?? []).filter((k) => SENIORITY_KWS.has(k));

  const [keywords, setKeywords] = useState<string[]>(baseKeywords);
  const [kwInput, setKwInput] = useState("");
  const [seniority, setSeniority] = useState<string[]>(baseSeniority);
  const [remote, setRemote] = useState<"any" | "remote" | "onsite">(
    seed?.remoteOnly === true ? "remote" : seed?.remoteOnly === false ? "onsite" : "any"
  );
  const [location, setLocation] = useState(seed?.locationFilter ?? "");
  const [emailAlerts, setEmailAlerts] = useState(existing?.emailAlerts ?? true);
  const [isPending, startTransition] = useTransition();

  function addKeyword() {
    const kw = kwInput.trim().toLowerCase();
    if (kw && !keywords.includes(kw) && !SENIORITY_KWS.has(kw)) {
      setKeywords((p) => [...p, kw]);
    }
    setKwInput("");
  }

  function toggleSeniority(kw: string) {
    setSeniority((p) => (p.includes(kw) ? p.filter((k) => k !== kw) : [...p, kw]));
  }

  function handleSubmit() {
    startTransition(async () => {
      const allKeywords = [...keywords, ...seniority];
      const criteria = {
        keywords: allKeywords,
        jobTypes: [] as JobType[],
        remoteOnly: remote === "remote" ? true : remote === "onsite" ? false : null,
        locationFilter: remote === "onsite" && location.trim() ? location.trim() : null,
        emailAlerts,
      };

      if (existing) {
        await updateCriteria(existing.id, criteria);
      } else {
        await followCompany(company.id, criteria);
      }
      onOpenChange(false);
    });
  }

  function handleUnfollow() {
    if (!existing) return;
    startTransition(async () => {
      await untrackCompany(existing.id);
      onOpenChange(false);
    });
  }

  const isEdit = !!existing;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>
            {isEdit ? `Following ${company.name}` : `Follow ${company.name}`}
          </DialogTitle>
          <p className="text-sm text-muted-foreground">
            {isEdit
              ? "Update your criteria. We'll only alert you for matching roles."
              : "Set your criteria and we'll email you when a matching role opens."}
          </p>
        </DialogHeader>

        <div className="space-y-5 py-1">
          {/* Keywords */}
          <div className="space-y-2">
            <Label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Role keywords
              <span className="ml-1 font-normal normal-case">(optional)</span>
            </Label>
            <div className="flex gap-2">
              <Input
                placeholder="e.g. engineer, designer, growth…"
                value={kwInput}
                onChange={(e) => setKwInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === ",") {
                    e.preventDefault();
                    addKeyword();
                  }
                }}
                className="h-8 text-sm"
              />
              <Button type="button" variant="outline" size="sm" onClick={addKeyword}>
                Add
              </Button>
            </div>
            {keywords.length > 0 && (
              <div className="flex flex-wrap gap-1.5">
                {keywords.map((kw) => (
                  <Badge key={kw} variant="secondary" className="gap-1 pl-2 pr-1">
                    {kw}
                    <button
                      onClick={() => setKeywords((p) => p.filter((k) => k !== kw))}
                      className="rounded hover:text-foreground transition-colors"
                    >
                      <X className="size-2.5" />
                    </button>
                  </Badge>
                ))}
              </div>
            )}
          </div>

          {/* Seniority */}
          <div className="space-y-2">
            <Label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Seniority
              <span className="ml-1 font-normal normal-case">(optional)</span>
            </Label>
            <div className="flex flex-wrap gap-1.5">
              {SENIORITY.map(({ label, kw }) => {
                const active = seniority.includes(kw);
                return (
                  <button
                    key={kw}
                    type="button"
                    onClick={() => toggleSeniority(kw)}
                    className={`rounded-full px-3 py-1 text-xs font-medium border transition-colors ${
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
            <Label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Work arrangement
            </Label>
            <div className="flex gap-1.5">
              {(["any", "remote", "onsite"] as const).map((val) => {
                const label = val === "any" ? "Any" : val === "remote" ? "Remote" : "On-site";
                return (
                  <button
                    key={val}
                    type="button"
                    onClick={() => setRemote(val)}
                    className={`rounded-full px-3 py-1 text-xs font-medium border transition-colors ${
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
                className="h-8 text-sm max-w-xs mt-1.5"
              />
            )}
          </div>

          {/* Email alerts */}
          <div className="flex items-center justify-between rounded-lg border px-3 py-2.5">
            <div>
              <p className="text-sm font-medium">Email alerts</p>
              <p className="text-xs text-muted-foreground">
                Get notified when a matching role opens
              </p>
            </div>
            <Switch checked={emailAlerts} onCheckedChange={setEmailAlerts} />
          </div>
        </div>

        <DialogFooter showCloseButton={false}>
          {isEdit && (
            <Button
              variant="destructive"
              size="sm"
              onClick={handleUnfollow}
              disabled={isPending}
              className="mr-auto"
            >
              Unfollow
            </Button>
          )}
          <Button variant="outline" size="sm" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button size="sm" onClick={handleSubmit} disabled={isPending}>
            {isPending ? "Saving…" : isEdit ? "Save changes" : `Follow ${company.name}`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
