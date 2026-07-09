"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { Check, BookmarkPlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { trackCollection } from "@/app/actions/tracking";
import { addAnonTracked } from "@/lib/anon-tracking";
import { analytics } from "@/lib/analytics";

type Props = {
  companies: { id: string; name: string }[];
  trackedIds: Set<string>;
  userId: string | null;
};

export function TrackCollectionButton({ companies, trackedIds, userId }: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const untracked = companies.filter((c) => !trackedIds.has(c.id));
  const allTracked = untracked.length === 0;

  function handleClick() {
    if (!userId) {
      // Preserve intent through the login wall (replayed post-auth) and
      // record the gated click so the funnel drop is measurable.
      for (const c of untracked) addAnonTracked(c.id);
      analytics.track("follow_intent_gated", {
        collection_size: untracked.length,
        source: "collection",
      });
      router.push("/login");
      return;
    }
    if (allTracked) return;
    startTransition(async () => {
      await trackCollection(untracked.map((c) => c.id));
      router.refresh();
    });
  }

  return (
    <Button
      variant={allTracked ? "secondary" : "default"}
      onClick={handleClick}
      disabled={allTracked || isPending}
      className="shrink-0"
    >
      {allTracked ? (
        <><Check className="size-3.5" /> All tracked</>
      ) : (
        <><BookmarkPlus className="size-3.5" /> {isPending ? "Tracking…" : `Track all ${companies.length}`}</>
      )}
    </Button>
  );
}
