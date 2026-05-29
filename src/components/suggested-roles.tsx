"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Plus, Check } from "lucide-react";
import { addTrackedRole } from "@/app/actions/roles";
import { getRoleSuggestions } from "@/lib/role-suggestions";

export function SuggestedRoles({ currentTitle }: { currentTitle: string }) {
  const router = useRouter();
  const suggestions = getRoleSuggestions(currentTitle, 6);
  const [added, setAdded] = useState<Set<string>>(new Set());
  const [isPending, startTransition] = useTransition();

  function handleAdd(title: string) {
    if (added.has(title) || isPending) return;
    setAdded((prev) => new Set(prev).add(title));
    startTransition(async () => {
      const res = await addTrackedRole(title);
      if (res.role) {
        window.dispatchEvent(
          new CustomEvent("crush:roleAdded", { detail: res.role })
        );
        router.refresh();
      }
    });
  }

  return (
    <div className="rounded-lg border bg-muted/30 p-4 space-y-3">
      <div>
        <p className="text-sm font-medium">Suggested for you</p>
        <p className="text-xs text-muted-foreground mt-0.5">
          Based on your current role as{" "}
          <span className="font-medium text-foreground">{currentTitle}</span>
        </p>
      </div>
      <div className="flex flex-wrap gap-1.5">
        {suggestions.map((s) => {
          const isAdded = added.has(s);
          return (
            <button
              key={s}
              type="button"
              onClick={() => handleAdd(s)}
              disabled={isAdded}
              className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium transition-all duration-150 ${
                isAdded
                  ? "border-primary/40 bg-primary/10 text-primary cursor-default"
                  : "border-border bg-background text-muted-foreground hover:border-foreground/30 hover:text-foreground"
              }`}
            >
              {isAdded ? (
                <Check className="size-3" />
              ) : (
                <Plus className="size-3" />
              )}
              {s}
            </button>
          );
        })}
      </div>
    </div>
  );
}
