"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Heart } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { followCompany, untrackCompany } from "@/app/actions/tracking";
import { addAnonTracked } from "@/lib/anon-tracking";
import { analytics } from "@/lib/analytics";

export function FollowButton({
  company,
  tracked,
  userId,
  size = "sm",
  tone = "solid",
}: {
  company: { id: string; name: string };
  tracked: { id: string } | null;
  userId: string | null;
  size?: "sm" | "default";
  /**
   * "solid": red-filled — for the one focused follow action on a page
   *   (company hero, collection). "quiet": outline until followed — for dense
   *   lists (browse grid) so red stays a signal, not wallpaper.
   */
  tone?: "solid" | "quiet";
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  // Optimistic local state: flips instantly, reverts on failure.
  const [following, setFollowing] = useState(!!tracked);

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

    const next = !following;
    setFollowing(next); // optimistic

    startTransition(async () => {
      const result = next
        ? await followCompany(company.id)
        : tracked
          ? await untrackCompany(tracked.id)
          : { error: "Not tracked" };

      if (result && "error" in result) {
        setFollowing(!next); // revert
        toast.error(
          next ? "Couldn't follow — try again." : "Couldn't unfollow — try again.",
        );
        return;
      }

      if (next) {
        toast.success(`${company.name} is on your list`, {
          description: "We'll email you the day a role that fits you opens there.",
        });
      }
      router.refresh();
    });
  }

  const variant = following
    ? "secondary"
    : tone === "quiet"
      ? "outline"
      : "default";

  return (
    <Button
      variant={variant}
      size={size}
      onClick={handleClick}
      disabled={isPending}
      aria-pressed={following}
      className={
        // Quiet follow buttons pick up red intent on hover so the action is
        // still discoverable without a wall of filled red across the grid.
        tone === "quiet" && !following
          ? "shrink-0 hover:border-primary/40 hover:text-primary"
          : "shrink-0"
      }
    >
      {following ? (
        <>
          <Heart key="on" className="size-3.5 animate-thunk fill-primary text-primary [--tilt:0deg]" />
          On your list
        </>
      ) : (
        <>
          <Heart className="size-3.5" />
          Add to list
        </>
      )}
    </Button>
  );
}
