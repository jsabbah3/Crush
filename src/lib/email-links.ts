/**
 * Shared link builder for outbound email.
 *
 * Every link in an email goes through /api/email/click so opens and clicks
 * are attributable, with UTM params carried on the final destination so the
 * landing page sees them too. Lived in duplicate in notifications.ts and
 * weekly-summary.ts; kept here so the two email paths can't drift apart.
 */
const APP_URL = process.env.APP_URL ?? "https://crushco.app";

export function emailLink(dest: string, uid: string, type: string): string {
  const utmDest = `${dest}${dest.includes("?") ? "&" : "?"}utm_source=email&utm_medium=email&utm_campaign=${type}`;
  return `${APP_URL}/api/email/click?uid=${uid}&type=${type}&url=${encodeURIComponent(utmDest)}`;
}
