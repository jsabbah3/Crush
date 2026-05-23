/**
 * Client-side analytics wrapper.
 * Import this from client components and hooks only.
 * All PostHog captures go through here — never call posthog.capture directly.
 */
import posthog from "posthog-js";

function safe(fn: () => void) {
  if (typeof window === "undefined") return;
  try {
    fn();
  } catch {
    // Never let analytics errors surface to users
  }
}

export const analytics = {
  identify(userId: string, traits?: Record<string, unknown>) {
    safe(() => posthog.identify(userId, traits));
  },

  track(event: string, properties?: Record<string, unknown>) {
    safe(() => posthog.capture(event, properties));
  },

  reset() {
    safe(() => posthog.reset());
  },
};
