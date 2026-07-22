"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { refreshMatches } from "@/app/actions/tracking";

export function RefreshMatchesButton({ className }: { className?: string }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  function handleRefresh() {
    startTransition(async () => {
      const { created } = await refreshMatches();
      if (created > 0) {
        toast.success(`${created} new match${created === 1 ? "" : "es"} found`);
        router.refresh();
      } else {
        toast("You're all caught up", {
          description: "No new matches since we last checked.",
        });
      }
    });
  }

  return (
    <button
      onClick={handleRefresh}
      disabled={isPending}
      title="Check for new matches"
      className={`inline-flex items-center gap-1.5 rounded-md px-1 py-0.5 text-xs text-muted-foreground transition-colors hover:text-foreground disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/60 ${className ?? ""}`}
    >
      <RefreshCw className={`size-3.5 ${isPending ? "animate-spin" : ""}`} />
      {isPending ? "Refreshing…" : "Refresh"}
    </button>
  );
}
