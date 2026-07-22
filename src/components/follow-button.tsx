"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { Check, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { followCompany, untrackCompany } from "@/app/actions/tracking";
import { addAnonTracked } from "@/lib/anon-tracking";
import { analytics } from "@/lib/analytics";

export function FollowButton({
  company,
  tracked,
  userId,
  size = "sm",
}: {
  company: { id: string; name: string };
  tracked: { id: string } | null;
  userId: string | null;
  size?: "sm" | "default";
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const isFollowing = !!tracked;

  function handleClick() {
    if (!userId) {
      // Preserve intent through the login wall: stash the company so it can
      // be auto-followed after auth (AnonTrackingReplay), and record the
      // gated click so the funnel drop is measurable.
      addAnonTracked(company.id);
      analytics.track("follow_intent_gated", {
        company_id: company.id,
        company_name: company.name,
      });
      router.push("/login");
      return;
    }
    startTransition(async () => {
      if (isFollowing) {
        await untrackCompany(tracked!.id);
      } else {
        await followCompany(company.id);
      }
      router.refresh();
    });
  }

  return (
    <Button
      variant={isFollowing ? "secondary" : "default"}
      size={size}
      onClick={handleClick}
      disabled={isPending}
      className="shrink-0"
    >
      {isFollowing ? (
        <>
          <Check className="size-3.5" />
          Getting alerts
        </>
      ) : (
        <>
          <Plus className="size-3.5" />
          Get alerts
        </>
      )}
    </Button>
  );
}
