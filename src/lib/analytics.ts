import posthog from "posthog-js";

const KEY = process.env.NEXT_PUBLIC_POSTHOG_KEY;
const HOST = process.env.NEXT_PUBLIC_POSTHOG_HOST ?? "https://us.i.posthog.com";

let initialized = false;

function init() {
  if (initialized || !KEY || typeof window === "undefined") return;
  posthog.init(KEY, {
    api_host: HOST,
    capture_pageview: false, // we fire page views manually per-page
    capture_pageleave: true,
    persistence: "localStorage+cookie",
  });
  initialized = true;
}

export const analytics = {
  identify(userId: string, traits?: Record<string, unknown>) {
    init();
    posthog.identify(userId, traits);
  },
  track(event: string, properties?: Record<string, unknown>) {
    init();
    posthog.capture(event, properties);
  },
  reset() {
    if (typeof window !== "undefined") posthog.reset();
  },
};
