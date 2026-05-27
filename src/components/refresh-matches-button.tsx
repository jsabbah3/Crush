"use client";

import { useState, useTransition } from "react";
import { RefreshCw } from "lucide-react";
import { refreshMatches } from "@/app/actions/tracking";

export function RefreshMatchesButton({ className }: { className?: string }) {
  const [isPending, startTransition] = useTransition();
  const [toast, setToast] = useState<string | null>(null);

  function handleRefresh() {
    startTransition(async () => {
      const { created } = await refreshMatches();
      setToast(
        created > 0
          ? `${created} new match${created === 1 ? "" : "es"} found!`
          : "Already up to date"
      );
      setTimeout(() => setToast(null), 3000);
    });
  }

  return (
    <div className={`relative inline-flex items-center ${className ?? ""}`}>
      <button
        onClick={handleRefresh}
        disabled={isPending}
        title="Refresh matches"
        className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors disabled:opacity-50"
      >
        <RefreshCw className={`size-3.5 ${isPending ? "animate-spin" : ""}`} />
        {isPending ? "Refreshing…" : "Refresh"}
      </button>

      {toast && (
        <span className="absolute left-full ml-2 whitespace-nowrap rounded-md bg-foreground text-background text-xs px-2 py-1 shadow-sm pointer-events-none">
          {toast}
        </span>
      )}
    </div>
  );
}
