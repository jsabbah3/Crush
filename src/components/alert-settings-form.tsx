"use client";

import { useState, useTransition } from "react";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { updateAlertMode, setAlertsPaused } from "@/app/actions/settings";
import { AlertMode } from "@/generated/prisma/enums";

type Props = {
  alertMode: AlertMode;
  alertsPaused: boolean;
};

const MODES: { value: AlertMode; label: string; description: string }[] = [
  {
    value: AlertMode.instant,
    label: "Instant",
    description: "Batched into a single email, sent within 15 minutes of a new match",
  },
  {
    value: AlertMode.daily,
    label: "Daily digest",
    description: "One email per day covering all new matches from the last 24 hours",
  },
];

export function AlertSettingsForm({ alertMode: initialMode, alertsPaused: initialPaused }: Props) {
  const [mode, setMode] = useState<AlertMode>(initialMode);
  const [paused, setPaused] = useState(initialPaused);
  const [isPending, startTransition] = useTransition();

  function handleModeChange(next: AlertMode) {
    if (next === mode) return;
    setMode(next);
    startTransition(async () => {
      await updateAlertMode(next);
    });
  }

  function handlePausedChange(next: boolean) {
    setPaused(next);
    startTransition(async () => {
      await setAlertsPaused(next);
    });
  }

  return (
    <div className="space-y-5">
      <div className="space-y-3">
        {MODES.map(({ value, label, description }) => (
          <label
            key={value}
            className={`flex items-start gap-3 rounded-lg border p-3 cursor-pointer transition-colors ${
              mode === value ? "border-primary bg-primary/5" : "border-border hover:border-muted-foreground/40"
            }`}
          >
            <input
              type="radio"
              name="alertMode"
              value={value}
              checked={mode === value}
              onChange={() => handleModeChange(value)}
              className="mt-0.5 accent-primary"
              disabled={isPending || paused}
            />
            <div>
              <p className="text-sm font-medium leading-none">{label}</p>
              <p className="text-xs text-muted-foreground mt-1">{description}</p>
            </div>
          </label>
        ))}
      </div>

      <div className="flex items-center justify-between rounded-lg border border-border p-3">
        <div>
          <Label htmlFor="alerts-paused" className="text-sm font-medium">
            Pause all alerts
          </Label>
          <p className="text-xs text-muted-foreground mt-0.5">
            Stop all emails until you resume
          </p>
        </div>
        <Switch
          id="alerts-paused"
          checked={paused}
          onCheckedChange={handlePausedChange}
          disabled={isPending}
        />
      </div>

      {paused && (
        <div className="flex items-center justify-between rounded-lg border border-amber-200 bg-amber-50 p-3">
          <p className="text-xs text-amber-800">
            All email alerts are paused. You'll still see matches in your dashboard.
          </p>
          <Button
            size="sm"
            variant="outline"
            className="ml-3 shrink-0 text-xs h-7"
            disabled={isPending}
            onClick={() => handlePausedChange(false)}
          >
            Resume
          </Button>
        </div>
      )}
    </div>
  );
}
