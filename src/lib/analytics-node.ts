import { PostHog } from "posthog-node";

const KEY = process.env.POSTHOG_KEY;
const HOST = process.env.NEXT_PUBLIC_POSTHOG_HOST ?? "https://us.i.posthog.com";

// Lazily instantiated so a missing key doesn't crash the app
let _client: PostHog | null = null;

function getClient(): PostHog | null {
  if (!KEY) return null;
  if (!_client) {
    _client = new PostHog(KEY, { host: HOST, flushAt: 1, flushInterval: 0 });
  }
  return _client;
}

export async function trackServerEvent(
  distinctId: string,
  event: string,
  properties?: Record<string, unknown>,
): Promise<void> {
  const client = getClient();
  if (!client) return;
  client.capture({ distinctId, event, properties: properties ?? {} });
  await client.flush();
}
