"use client";

import { useEffect } from "react";
import { analytics } from "@/lib/analytics";

/**
 * Drop this into any server-rendered page to fire a single analytics event
 * once the page mounts in the browser. Renders nothing.
 */
export function PageView({
  event,
  properties,
}: {
  event: string;
  properties?: Record<string, unknown>;
}) {
  useEffect(() => {
    analytics.track(event, properties);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [event]);

  return null;
}
