/**
 * Collections reachable by link only: left out of every list, the sitemap and
 * search engines. For lists made with or for a partner who hasn't launched
 * them yet — the page works, nobody stumbles onto it.
 */
export const UNLISTED_COLLECTIONS = ["founders-you-should-know", "breakout-list"];

/** Prisma `where` for collections we show in lists. */
export const listedCollections = { slug: { notIn: UNLISTED_COLLECTIONS } };
