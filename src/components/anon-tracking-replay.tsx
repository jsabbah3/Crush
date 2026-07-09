"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { getAnonTracked, clearAnonTracking } from "@/lib/anon-tracking";
import { followCompany } from "@/app/actions/tracking";

/**
 * Replays companies a visitor tried to follow before signing in.
 *
 * FollowButton stashes the company id in localStorage when an anonymous
 * user clicks "Get alerts"; this component (mounted in the authed layouts)
 * follows those companies on first load after auth, so the user lands on
 * a watchlist that already contains the company they came for.
 */
export function AnonTrackingReplay() {
  const router = useRouter();
  const ran = useRef(false);

  useEffect(() => {
    if (ran.current) return;
    ran.current = true;

    const ids = getAnonTracked();
    if (ids.length === 0) return;

    (async () => {
      for (const id of ids) {
        try {
          await followCompany(id, "anon_replay");
        } catch {
          // Company may have been deleted; don't block the rest.
        }
      }
      clearAnonTracking();
      router.refresh();
    })();
  }, [router]);

  return null;
}
