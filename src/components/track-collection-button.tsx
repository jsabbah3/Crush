"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Check, BookmarkPlus, X } from "lucide-react";
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
import { trackCollection } from "@/app/actions/tracking";
import type { JobType } from "@/generated/prisma/enums";

const SENIORITY = [
  { label: "Junior", kw: "junior" },
  { label: "Mid", kw: "mid" },
  { label: "Senior", kw: "senior" },
  { label: "Staff", kw: "staff" },
  { label: "Lead", kw: "lead" },
];
const SENIORITY_KWS = new Set(SENIORITY.map((s) => s.kw));

type Props = {
  collectionName: string;
  collectionSlug: string;
  companies: { id: string; name: string }[];
  trackedIds: Set<string>;
  userId: string | null;
};

export function TrackCollectionButton({
  collectionName,
  collectionSlug,
  companies,
  trackedIds,
  userId,
}: Props) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();

  // Criteria state
  const [keywords, setKeywords] = useState<string[]>([]);
  const [kwInput, setKwInput] = useState("");
  const [seniority, setSeniority] = useState<string[]>([]);
  const [remote, setRemote] = useState<"any" | "remote" | "onsite">("any");
  const [location, setLocation] = useState("");
  const [emailAlerts, setEmailAlerts] = useState(true);

  const untracked = companies.filter((c) => !trackedIds.has(c.id));
  const allTracked = untracked.length === 0;

  function handleOpen() {
    if (!userId) { router.push("/login"); return; }
    if (allTracked) return;
    setOpen(true);
  }

  function addKeyword() {
    const kw = kwInput.trim().toLowerCase();
    if (kw && !keywords.includes(kw) && !SENIORITY_KWS.has(kw)) {
      setKeywords((p) => [...p, kw]);
    }
    setKwInput("");
  }

  function handleSubmit() {
    startTransition(async () => {
      await trackCollection(untracked.map((c) => c.id), {
        keywords: [...keywords, ...seniority],
        jobTypes: [] as JobType[],
        remoteOnly: remote === "remote" ? true : remote === "onsite" ? false : null,
        locationFilter: remote === "onsite" && location.trim() ? location.trim() : null,
        emailAlerts,
      });
      setOpen(false);
      router.refresh();
    });
  }

  return (
    <>
      <Button
        variant={allTracked ? "secondary" : "default"}
        onClick={handleOpen}
        disabled={allTracked || isPending}
        className="shrink-0"
      >
        {allTracked ? (
          <><Check className="size-3.5" /> All tracked</>
        ) : (
          <><BookmarkPlus className="size-3.5" /> Track all {companies.length}</>
        )}
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Track {collectionName}</DialogTitle>
            <p className="text-sm text-muted-foreground">
              Set your criteria once — we'll apply it to all{" "}
              {untracked.length === companies.length
                ? companies.length
                : `${untracked.length} untracked`}{" "}
              {untracked.length === 1 ? "company" : "companies"} in this collection.
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
                      <button onClick={() => setKeywords((p) => p.filter((k) => k !== kw))}>
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
                      onClick={() =>
                        setSeniority((p) =>
                          p.includes(kw) ? p.filter((k) => k !== kw) : [...p, kw]
                        )
                      }
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
            <Button variant="outline" size="sm" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button size="sm" onClick={handleSubmit} disabled={isPending}>
              {isPending
                ? "Tracking…"
                : `Track ${untracked.length} ${untracked.length === 1 ? "company" : "companies"}`}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
