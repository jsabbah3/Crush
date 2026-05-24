"use client";

import { useState, useTransition } from "react";
import { X, Plus } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { addTrackedRole, removeTrackedRole } from "@/app/actions/roles";

type Role = { id: string; title: string };

export function TrackedRoles({
  initialRoles,
  trackedCount,
}: {
  initialRoles: Role[];
  trackedCount: number;
}) {
  const [roles, setRoles] = useState<Role[]>(initialRoles);
  const [input, setInput] = useState("");
  const [isPending, startTransition] = useTransition();

  function handleAdd() {
    const title = input.trim();
    if (!title || roles.some((r) => r.title.toLowerCase() === title.toLowerCase())) {
      setInput("");
      return;
    }

    const optimisticId = `temp-${Date.now()}`;
    setRoles((prev) => [...prev, { id: optimisticId, title }]);
    setInput("");

    startTransition(async () => {
      await addTrackedRole(title);
    });
  }

  function handleRemove(id: string) {
    setRoles((prev) => prev.filter((r) => r.id !== id));
    startTransition(async () => {
      await removeTrackedRole(id);
    });
  }

  return (
    <div className="space-y-3">
      {/* Input */}
      <div className="flex gap-2">
        <Input
          placeholder="e.g. GTM Engineer, Product Designer…"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === ",") {
              e.preventDefault();
              handleAdd();
            }
          }}
          className="h-8 text-sm"
        />
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={handleAdd}
          disabled={isPending || !input.trim()}
          className="shrink-0"
        >
          <Plus className="size-3.5" />
          Add
        </Button>
      </div>

      {/* Role tags */}
      {roles.length > 0 ? (
        <div className="flex flex-wrap gap-1.5">
          {roles.map((role) => (
            <span
              key={role.id}
              className="inline-flex items-center gap-1 rounded-full border border-primary/40 bg-primary/10 px-2.5 py-0.5 text-xs font-medium text-primary"
            >
              {role.title}
              <button
                onClick={() => handleRemove(role.id)}
                className="ml-0.5 rounded-full hover:text-primary/60 transition-colors"
                aria-label={`Remove ${role.title}`}
              >
                <X className="size-2.5" />
              </button>
            </span>
          ))}
        </div>
      ) : (
        <p className="text-xs text-muted-foreground">
          No roles yet. Add one above and we'll match it across all{" "}
          {trackedCount > 0 ? `your ${trackedCount} tracked` : "your tracked"}{" "}
          {trackedCount === 1 ? "company" : "companies"}.
        </p>
      )}

      {roles.length > 0 && trackedCount > 0 && (
        <p className="text-xs text-muted-foreground">
          Matched against {trackedCount} tracked{" "}
          {trackedCount === 1 ? "company" : "companies"} on every ingest.
        </p>
      )}
    </div>
  );
}
