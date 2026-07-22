"use client";

import { useEffect } from "react";
import { RotateCw } from "lucide-react";
import { Button } from "@/components/ui/button";

/**
 * Calm, specific error UI shared by every route group's error.tsx.
 * This Next version passes `unstable_retry` (not `reset`) to error boundaries.
 */
export function PageError({
  error,
  retry,
  title = "Something went sideways",
  message = "We couldn't load this page. It's on our side, not yours — give it another try.",
}: {
  error: Error & { digest?: string };
  retry: () => void;
  title?: string;
  message?: string;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="flex flex-col items-center justify-center py-24 text-center">
      <div className="max-w-sm space-y-4">
        <div className="space-y-1.5">
          <h1 className="font-heading text-xl font-bold tracking-tight">{title}</h1>
          <p className="text-sm text-muted-foreground leading-relaxed">{message}</p>
        </div>
        <Button onClick={retry} variant="ink" size="sm" className="gap-1.5">
          <RotateCw className="size-3.5" />
          Try again
        </Button>
        {error.digest && (
          <p className="font-mono text-[11px] text-muted-foreground/50">
            ref {error.digest}
          </p>
        )}
      </div>
    </div>
  );
}
