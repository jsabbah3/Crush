"use client";

import { useState } from "react";
import Link from "next/link";
import { TrackedRoles } from "@/components/tracked-roles";

type Prefs = {
  seniority: string[];
  remoteOnly: boolean | null;
  locationFilter: string | null;
};

function cap(s: string) {
  return s.charAt(0).toUpperCase() + s.slice(1).replace(/_/g, " ");
}

function where(p: Prefs): string | null {
  if (p.remoteOnly === true) return "remote only";
  if (p.locationFilter && p.remoteOnly === false) return `in ${p.locationFilter}, not remote`;
  if (p.locationFilter) return `${p.locationFilter} or remote`;
  if (p.remoteOnly === false) return "on-site or hybrid";
  return null;
}

/**
 * What Crush is watching for, in one sentence — so a match (or the lack of
 * one) always has a visible reason. Editable in place.
 */
export function WatchBrief({
  roles,
  prefs,
  companyCount,
  checked,
}: {
  roles: { id: string; title: string }[];
  prefs: Prefs;
  companyCount: number;
  /** e.g. "this morning" or "Nov 14" — when boards were last read. */
  checked: string | null;
}) {
  const [editing, setEditing] = useState(false);
  const loc = where(prefs);

  return (
    <div className="border-y border-foreground/80 py-3">
      <div className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-2">
        <p className="max-w-[70ch] leading-relaxed">
          Watching{" "}
          <Link href="/list" className="font-semibold underline decoration-foreground/30 underline-offset-4 hover:decoration-primary">
            {companyCount} {companyCount === 1 ? "company" : "companies"}
          </Link>{" "}
          for{" "}
          {roles.map((r, i) => (
            <span key={r.id}>
              {i > 0 && (i === roles.length - 1 ? " or " : ", ")}
              <span className="font-heading text-[1.08em] font-semibold italic">{r.title}</span>
            </span>
          ))}
          {prefs.seniority.length > 0 && (
            <span className="text-muted-foreground"> · {prefs.seniority.map(cap).join(", ")}</span>
          )}
          {loc && <span className="text-muted-foreground"> · {loc}</span>}
        </p>
        <div className="flex shrink-0 items-baseline gap-4">
          {checked && (
            <span className="font-mono text-xs text-muted-foreground">Boards checked {checked}</span>
          )}
          <button
            type="button"
            onClick={() => setEditing((e) => !e)}
            aria-expanded={editing}
            className="cursor-pointer text-sm font-semibold underline decoration-primary decoration-2 underline-offset-4 hover:text-primary"
          >
            {editing ? "Done" : "Edit"}
          </button>
        </div>
      </div>

      {editing && (
        <div className="mt-4 space-y-3 border-t border-foreground/15 pt-4">
          <p className="text-sm text-muted-foreground">
            Titles are matched against every new posting at the companies on your list. Broad (&ldquo;account
            executive&rdquo;) or narrow (&ldquo;enterprise AE&rdquo;) both work.
          </p>
          <TrackedRoles
            initialRoles={roles}
            trackedCount={companyCount}
            initialSeniority={prefs.seniority}
            initialRemoteOnly={prefs.remoteOnly}
            initialLocationFilter={prefs.locationFilter}
          />
        </div>
      )}
    </div>
  );
}
