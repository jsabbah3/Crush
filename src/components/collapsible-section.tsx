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
  // Suppress the entry transition on first paint so a persisted-closed section
  // doesn't animate shut on every load — it just starts closed.
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (storageKey) {
      const saved = localStorage.getItem(`crush:section:${storageKey}`);
      if (saved !== null) setOpen(saved === "true");
    }
    // Next frame: allow transitions for user-driven toggles only.
    const id = requestAnimationFrame(() => setReady(true));
    return () => cancelAnimationFrame(id);
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
          className="group flex items-center gap-2 rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/60"
          aria-expanded={open}
        >
          <ChevronDown
            className={`size-4 text-muted-foreground transition-transform duration-[var(--dur-med)] ease-[var(--ease-settle)] ${open ? "" : "-rotate-90"}`}
          />
          <h2 className="font-heading text-lg font-bold tracking-tight group-hover:text-foreground/80 transition-colors">
            {title}
          </h2>
        </button>
        {action && <div>{action}</div>}
      </div>
      <div
        className={`collapse-grid ${ready ? "" : "[transition:none]"}`}
        data-collapsed={!open || undefined}
        aria-hidden={!open}
      >
        <div className="min-w-0">{children}</div>
      </div>
    </section>
  );
}
