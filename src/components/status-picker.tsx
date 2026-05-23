"use client";

import { useState, useTransition } from "react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
} from "@/components/ui/select";
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
import { updateApplicationStatus } from "@/app/actions/applications";
import { analytics } from "@/lib/analytics";

export type AppStatus =
  | "INTERESTED"
  | "APPLIED"
  | "INTERVIEWING"
  | "REJECTED"
  | "OFFER"
  | "NOT_INTERESTED";

export const STATUS_CONFIG: Record<
  AppStatus,
  { label: string; dot: string; text: string }
> = {
  INTERESTED:    { label: "Interested",    dot: "bg-muted-foreground/40", text: "text-muted-foreground" },
  APPLIED:       { label: "Applied",       dot: "bg-blue-500",            text: "text-blue-600 dark:text-blue-400" },
  INTERVIEWING:  { label: "Interviewing",  dot: "bg-amber-500",           text: "text-amber-600 dark:text-amber-400" },
  OFFER:         { label: "Offer",         dot: "bg-green-500",           text: "text-green-600 dark:text-green-400" },
  REJECTED:      { label: "Rejected",      dot: "bg-red-400",             text: "text-muted-foreground" },
  NOT_INTERESTED:{ label: "Not interested",dot: "bg-muted-foreground/20", text: "text-muted-foreground" },
};

const STATUS_ORDER: AppStatus[] = [
  "INTERESTED",
  "APPLIED",
  "INTERVIEWING",
  "OFFER",
  "REJECTED",
  "NOT_INTERESTED",
];

export function StatusPicker({
  matchId,
  jobId,
  initialStatus,
}: {
  matchId: string;
  jobId?: string;
  initialStatus: AppStatus;
}) {
  const [status, setStatus] = useState<AppStatus>(initialStatus);
  const [pendingApply, setPendingApply] = useState(false);
  const [note, setNote] = useState("");
  const [appliedAt, setAppliedAt] = useState(
    () => new Date().toISOString().slice(0, 10),
  );
  const [isPending, startTransition] = useTransition();

  const cfg = STATUS_CONFIG[status];

  function handleChange(next: AppStatus) {
    analytics.track("job_status_changed", {
      from_status: status,
      to_status: next,
      job_id: jobId ?? matchId,
    });
    if (next === "APPLIED") {
      setPendingApply(true);
    } else {
      startTransition(async () => {
        await updateApplicationStatus(matchId, next as never, null, null);
        setStatus(next);
      });
    }
  }

  function confirmApplied() {
    startTransition(async () => {
      await updateApplicationStatus(
        matchId,
        "APPLIED" as never,
        note.trim() || null,
        new Date(appliedAt),
      );
      setStatus("APPLIED");
      setPendingApply(false);
      setNote("");
    });
  }

  return (
    <>
      <Select
        value={status}
        onValueChange={(v) => handleChange(v as AppStatus)}
      >
        <SelectTrigger
          size="sm"
          className={`w-auto gap-1.5 border-none bg-transparent shadow-none px-0 hover:bg-transparent focus-visible:ring-0 ${isPending ? "opacity-50 pointer-events-none" : ""}`}
        >
          <span className={`size-2 rounded-full shrink-0 ${cfg.dot}`} />
          <span className={`text-xs font-medium ${cfg.text}`}>{cfg.label}</span>
        </SelectTrigger>
        <SelectContent align="end">
          {STATUS_ORDER.map((s) => (
            <SelectItem key={s} value={s}>
              <span className={`size-2 rounded-full shrink-0 ${STATUS_CONFIG[s].dot}`} />
              <span>{STATUS_CONFIG[s].label}</span>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Dialog open={pendingApply} onOpenChange={(o) => !o && setPendingApply(false)}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Mark as Applied</DialogTitle>
            <p className="text-sm text-muted-foreground">
              Save an optional note and date for your records.
            </p>
          </DialogHeader>

          <div className="space-y-4 py-1">
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Date applied
              </Label>
              <Input
                type="date"
                value={appliedAt}
                onChange={(e) => setAppliedAt(e.target.value)}
                className="h-8 text-sm"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Note <span className="font-normal normal-case">(optional)</span>
              </Label>
              <Input
                placeholder='e.g. "applied via referral from Sarah"'
                value={note}
                onChange={(e) => setNote(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && confirmApplied()}
                className="h-8 text-sm"
              />
            </div>
          </div>

          <DialogFooter showCloseButton={false}>
            <Button variant="outline" size="sm" onClick={() => setPendingApply(false)}>
              Cancel
            </Button>
            <Button size="sm" onClick={confirmApplied} disabled={isPending}>
              {isPending ? "Saving…" : "Mark as Applied"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
