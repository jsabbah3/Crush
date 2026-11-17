/** Freshness windows and checks — no server imports, safe in client components. */

/** How long a company counts as "New on Crush" / "Just raised". */
export const NEW_DAYS = 30;
export const RAISED_DAYS = 60;

const DAY = 86_400_000;

export function isNewOnCrush(listedAt: Date | string | null | undefined, now = Date.now()): boolean {
  return !!listedAt && now - new Date(listedAt).getTime() < NEW_DAYS * DAY;
}

export function isJustRaised(recentlyFundedAt: Date | string | null | undefined, now = Date.now()): boolean {
  return !!recentlyFundedAt && now - new Date(recentlyFundedAt).getTime() < RAISED_DAYS * DAY;
}

