"use client";

import { useState, useEffect, type ReactNode } from "react";
import { ChevronDown } from "lucide-react";

export function CollapsibleSection({
  title,
  action,
  children,
  storageKey,
  defaultOpen = true,
}: {
  title: string;
  action?: ReactNode;
  children: ReactNode;
  storageKey?: string;
  defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);

  // Restore persisted state
  useEffect(() => {
    if (!storageKey) return;
    const saved = localStorage.getItem(`crush:section:${storageKey}`);
    if (saved !== null) setOpen(saved === "true");
  }, [storageKey]);

  function toggle() {
    setOpen((v) => {
      const next = !v;
      if (storageKey) localStorage.setItem(`crush:section:${storageKey}`, String(next));
      return next;
    });
  }

  return (
    <section>
      <div className="flex items-center justify-between mb-4">
        <button
          onClick={toggle}
          className="flex items-center gap-2 group"
          aria-expanded={open}
        >
          <ChevronDown
            className={`size-4 text-muted-foreground transition-transform duration-200 ${open ? "" : "-rotate-90"}`}
          />
          <h2 className="font-heading text-lg font-bold tracking-tight group-hover:text-foreground/80 transition-colors">
            {title}
          </h2>
        </button>
        {action && <div>{action}</div>}
      </div>
      {open && children}
    </section>
  );
}
