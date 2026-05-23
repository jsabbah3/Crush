/**
 * Server-side analytics wrapper using posthog-node.
 * Import this from server actions, route handlers, and cron utilities only.
 * Never import this from client components.
 */
import "server-only";
import { PostHog } from "posthog-node";

// Module-level singleton with immediate-flush config (safe for serverless).
// flushAt:1 + flushInterval:0 means each capture() triggers an HTTP request immediately.
let _client: PostHog | undefined;

function getClient(): PostHog | null {
  const key = process.env.NEXT_PUBLIC_POSTHOG_KEY;
  if (!key) return null;
  if (!_client) {
    _client = new PostHog(key, {
      host: process.env.NEXT_PUBLIC_POSTHOG_HOST ?? "https://us.i.posthog.com",
      flushAt: 1,
      flushInterval: 0,
    });
  }
  return _client;
}

export async function trackServerEvent(
  distinctId: string,
  event: string,
  properties?: Record<string, unknown>,
): Promise<void> {
  try {
    const client = getClient();
    if (!client) return;
    client.capture({ distinctId, event, properties: properties ?? {} });
  } catch {
    // Never let analytics errors affect core flows
  }
}
