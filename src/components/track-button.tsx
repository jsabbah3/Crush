"use client";

import { useTransition } from "react";
import { Check, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { trackCompany, untrackCompany } from "@/app/actions/tracking";

export function TrackButton({
  companyId,
  trackedId,
}: {
  companyId: string;
  trackedId: string | undefined;
}) {
  const [isPending, startTransition] = useTransition();
  const isTracked = !!trackedId;

  function handleClick() {
    startTransition(async () => {
      if (isTracked && trackedId) {
        await untrackCompany(trackedId);
      } else {
        await trackCompany(companyId);
      }
    });
  }

  return (
    <Button
      variant={isTracked ? "secondary" : "outline"}
      size="sm"
      onClick={handleClick}
      disabled={isPending}
      className="shrink-0"
    >
      {isTracked ? (
        <>
          <Check className="size-3.5" />
          Tracking
        </>
      ) : (
        <>
          <Plus className="size-3.5" />
          Track
        </>
      )}
    </Button>
  );
}
