"use client";

import { useEffect } from "react";
import { analytics } from "@/lib/analytics";

/**
 * Invisible component — rendered in the authenticated layout.
 * Calls posthog.identify() once per mount so all subsequent events
 * on this session are attributed to the correct user profile.
 */
export function UserIdentifier({
  userId,
  email,
  name,
  createdAt,
}: {
  userId: string;
  email: string;
  name: string | null;
  createdAt: Date;
}) {
  useEffect(() => {
    analytics.identify(userId, {
      email,
      name: name ?? undefined,
      created_at: createdAt.toISOString(),
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId]);

  return null;
}
