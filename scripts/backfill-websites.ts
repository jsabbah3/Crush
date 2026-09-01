/**
 * Backfill company websites that are missing, by guessing a domain from the
 * company name and then verifying the page that answers actually belongs to
 * that company.
 *
 * A domain resolving is NOT evidence it is the right company. paradigm.com is a
 * Canadian speaker manufacturer, not Paradigm the VC; exa.com redirects to
 * Dassault Systèmes, not Exa the search company. A wrong website is worse than
 * none: it becomes the favicon logo on the company page and a slug candidate
 * for ATS board detection. So every candidate has to earn its way in.
 *
 * Pipeline per company:
 *   1. Build domain candidates from the name across .com / .io / .ai / .co.
 *   2. GET each (following redirects) until one answers.
 *   3. Read <title> + og:site_name from the response.
 *   4. Accept only if the company name appears there on a token boundary and
 *      the page isn't a parking placeholder. Save the FINAL redirected origin,
 *      so baseten.com is stored as its real home baseten.co.
 *
 * Known ceiling: nothing here can separate two real companies that share a name.
 * The failure mode is concentrated in companies named after a common English
 * word — sierra.com is Sierra Trading Post, block.co mints NFTs, paradigm.com
 * sells loudspeakers, factorial.io is a German agency, and all four pass a
 * name-on-page check because the name genuinely is on the page. So single
 * dictionary-word names are held back in a REVIEW tier and not auto-applied.
 * Coined names (Baseten, Deepjudge, Exa, n8n) verify reliably.
 *
 * Dry run, curated:   npx tsx --env-file=.env.local scripts/backfill-websites.ts
 * Dry run, whole DB:  npx tsx --env-file=.env.local scripts/backfill-websites.ts --all
 * Bounded trial:      npx tsx --env-file=.env.local scripts/backfill-websites.ts --all --limit 400
 * Apply:              npx tsx --env-file=.env.local scripts/backfill-websites.ts --apply
 * Include review tier: ... --apply --include-review     (hand-check these first)
 */
import { readFileSync } from "fs";
import { prisma } from "../src/lib/prisma";

const APPLY = process.argv.includes("--apply");
const SCOPE_ALL = process.argv.includes("--all");
const VERBOSE = process.argv.includes("--verbose");
const INCLUDE_REVIEW = process.argv.includes("--include-review");

/**
 * Common English words, used to spot company names that collide with ordinary
 * vocabulary. Optional: if the system dictionary isn't present the guard simply
 * doesn't fire and everything verified lands in the accepted tier.
 */
const DICTIONARY: Set<string> = (() => {
  for (const path of ["/usr/share/dict/words", "/usr/dict/words"]) {
    try {
      return new Set(
        readFileSync(path, "utf-8").split("\n").map((w) => w.trim().toLowerCase()).filter((w) => w.length >= 3)
      );
    } catch {
      // try next
    }
  }
  console.warn("⚠ No system dictionary found — common-word guard disabled.\n");
  return new Set<string>();
})();

const limitFlag = process.argv.indexOf("--limit");
const LIMIT = limitFlag !== -1 ? Number(process.argv[limitFlag + 1]) : null;

const CONCURRENCY = 12;
const TIMEOUT_MS = 8000;
const TLDS = ["com", "io", "ai", "co"] as const;

/** Strip a company name down to a comparable alphanumeric stem. */
function nameStem(name: string): string | null {
  const cleaned = name
    .toLowerCase()
    .replace(/\(.*?\)/g, "")
    .replace(/\b(inc|llc|corp|ltd|co|the|labs?|technologies|technology|software|group|agency|studio|alumni|job board)\b/g, "")
    .replace(/[^a-z0-9]/g, "");
  if (cleaned.length < 3 || /^\d+$/.test(cleaned)) return null;
  return cleaned;
}

/** Domain guesses for a name, most-likely first. */
function candidates(name: string): string[] {
  const stem = nameStem(name);
  if (!stem) return [];
  return TLDS.map((tld) => `${stem}.${tld}`);
}

type Probe = { finalUrl: string; title: string; siteName: string };

async function probe(domain: string): Promise<Probe | null> {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), TIMEOUT_MS);
  try {
    const res = await fetch(`https://${domain}`, {
      redirect: "follow",
      signal: ctrl.signal,
      headers: { "user-agent": "Mozilla/5.0 (compatible; CrushBot/1.0)" },
    });
    if (res.status >= 400) return null;
    const html = (await res.text()).slice(0, 60_000); // titles live in <head>
    const title = html.match(/<title[^>]*>([^<]*)<\/title>/i)?.[1]?.trim() ?? "";
    const siteName =
      html.match(/<meta[^>]+property=["']og:site_name["'][^>]+content=["']([^"']*)["']/i)?.[1]?.trim() ?? "";
    return { finalUrl: res.url || `https://${domain}`, title, siteName };
  } catch {
    return null;
  } finally {
    clearTimeout(t);
  }
}

/** Domain marketplaces a squatted name lands on. */
const PARKING_HOSTS = [
  "hugedomains", "afternic", "sedo", "dan.com", "diginames", "buydomains",
  "available.forsale", "domainmarket", "undeveloped", "brandbucket", "squadhelp",
];

/** Parked / for-sale / placeholder pages carry no company signal. */
function looksParked(p: Probe, domain: string): boolean {
  const t = p.title.toLowerCase().trim();
  const host = (() => { try { return new URL(p.finalUrl).hostname.toLowerCase(); } catch { return ""; } })();
  if (PARKING_HOSTS.some((h) => host.includes(h))) return true;
  if (!t) return true;                                    // no title at all
  if (t === domain || t === `www.${domain}`) return true; // title is just the domain
  return /(domain (is )?for sale|buy this domain|parked|coming soon|under construction|godaddy|namecheap|sedo)/i.test(t);
}

/**
 * Where a guess redirects matters more than what the landing page says. A
 * squatted name sends you to a marketplace whose page still echoes the name
 * back ("akabrands.com is for sale"), so the title check passes. Requiring the
 * final hostname to still carry the stem cuts that whole class: baseten.com →
 * baseten.co keeps "baseten" and survives, akabrands.com → hugedomains.com
 * doesn't and dies.
 */
function landsOnOwnDomain(finalUrl: string, stem: string): boolean {
  try {
    const host = new URL(finalUrl).hostname.toLowerCase().replace(/^www\./, "");
    const flat = host.replace(/[^a-z0-9]/g, "");
    return flat.includes(stem) || stem.includes(flat.replace(/(com|io|ai|co|net|org|us|couk)$/, ""));
  } catch {
    return false;
  }
}

/**
 * Does this page identify itself as the company? Requires the stem to appear on
 * a token boundary so "exa" doesn't match "Dassault Exascale".
 */
function identifiesAs(p: Probe, stem: string): boolean {
  const haystack = `${p.title} ${p.siteName}`.toLowerCase();
  const tokens = haystack.split(/[^a-z0-9]+/).filter(Boolean);
  if (tokens.includes(stem)) return true;
  // Multi-word names collapse in the stem ("fireworksai"); allow the
  // concatenation of adjacent tokens to match too.
  for (let i = 0; i < tokens.length; i++) {
    let joined = "";
    for (let j = i; j < Math.min(i + 4, tokens.length); j++) {
      joined += tokens[j];
      if (joined === stem) return true;
      if (joined.length > stem.length) break;
    }
  }
  return false;
}

/** Normalise to a storable origin, dropping paths and tracking noise. */
function toOrigin(finalUrl: string): string | null {
  try {
    const u = new URL(finalUrl);
    return `${u.protocol}//${u.hostname}`;
  } catch {
    return null;
  }
}

/**
 * A single-token name that is also an ordinary English word can't be told apart
 * from an unrelated company of the same name by anything on the page.
 */
function isCommonWord(name: string, stem: string): boolean {
  const multiWord = name.trim().split(/\s+/).length > 1;
  return !multiWord && DICTIONARY.has(stem);
}

type Outcome =
  | { kind: "accepted"; website: string; via: string; title: string }
  | { kind: "review"; website: string; via: string; title: string }
  | { kind: "rejected"; reason: string; domain: string; title: string }
  | { kind: "no-answer" }
  | { kind: "no-candidate" };

async function classify(name: string): Promise<Outcome> {
  const stem = nameStem(name);
  if (!stem) return { kind: "no-candidate" };

  let lastReject: Outcome | null = null;

  for (const domain of candidates(name)) {
    const p = await probe(domain);
    if (!p) continue;

    if (looksParked(p, domain)) {
      lastReject = { kind: "rejected", reason: "parked/placeholder", domain, title: p.title };
      continue;
    }
    if (!identifiesAs(p, stem)) {
      lastReject = { kind: "rejected", reason: "name not on page", domain, title: p.title };
      continue;
    }
    if (!landsOnOwnDomain(p.finalUrl, stem)) {
      lastReject = { kind: "rejected", reason: `redirects off-name → ${p.finalUrl.slice(0, 40)}`, domain, title: p.title };
      continue;
    }
    const origin = toOrigin(p.finalUrl);
    if (!origin) {
      lastReject = { kind: "rejected", reason: "unparseable final url", domain, title: p.title };
      continue;
    }
    return isCommonWord(name, stem)
      ? { kind: "review", website: origin, via: domain, title: p.title }
      : { kind: "accepted", website: origin, via: domain, title: p.title };
  }

  return lastReject ?? { kind: "no-answer" };
}

async function main() {
  const curatedOnly = {
    OR: [
      { trackedBy: { some: {} } },
      { collections: { some: {} } },
      { insights: { some: {} } },
      { sourceType: { in: ["greenhouse", "lever", "ashby", "gem"] as const } },
    ],
  };

  const companies = await prisma.company.findMany({
    where: { website: null, ...(SCOPE_ALL ? {} : curatedOnly) },
    select: { id: true, name: true },
    orderBy: { name: "asc" },
    ...(LIMIT ? { take: LIMIT } : {}),
  });

  console.log(
    `${companies.length} companies missing a website. ` +
    `Scope: ${SCOPE_ALL ? "ALL" : "curated"}${LIMIT ? ` (first ${LIMIT})` : ""}. ` +
    `Mode: ${APPLY ? "APPLY" : "DRY RUN"}\n`
  );

  const stats = { accepted: 0, review: 0, rejected: 0, noAnswer: 0, noCandidate: 0 };
  const rejects: string[] = [];
  const reviews: string[] = [];

  for (let i = 0; i < companies.length; i += CONCURRENCY) {
    const batch = companies.slice(i, i + CONCURRENCY);
    await Promise.all(
      batch.map(async (c) => {
        const outcome = await classify(c.name);
        switch (outcome.kind) {
          case "accepted": {
            stats.accepted++;
            const redirected = !outcome.website.includes(outcome.via) ? `  (via ${outcome.via})` : "";
            console.log(`✓ ${c.name.padEnd(28)} → ${outcome.website}${redirected}`);
            if (APPLY) {
              await prisma.company.update({ where: { id: c.id }, data: { website: outcome.website } });
            }
            break;
          }
          case "review": {
            stats.review++;
            reviews.push(`  ? ${c.name.padEnd(28)} → ${outcome.website.padEnd(34)} "${outcome.title.slice(0, 55)}"`);
            if (APPLY && INCLUDE_REVIEW) {
              await prisma.company.update({ where: { id: c.id }, data: { website: outcome.website } });
            }
            break;
          }
          case "rejected":
            stats.rejected++;
            rejects.push(`  ✗ ${c.name.padEnd(28)} ${outcome.domain} — ${outcome.reason} — "${outcome.title.slice(0, 60)}"`);
            break;
          case "no-answer":
            stats.noAnswer++;
            break;
          case "no-candidate":
            stats.noCandidate++;
            break;
        }
      })
    );
  }

  if (reviews.length) {
    console.log(`\n── Needs review: name is a common English word, so the page can't confirm it ──`);
    for (const r of reviews) console.log(r);
  }

  if (VERBOSE && rejects.length) {
    console.log(`\n── Rejected (resolved but failed verification) ──`);
    for (const r of rejects) console.log(r);
  }

  const considered = stats.accepted + stats.review + stats.rejected;
  console.log(`\n───────────────────────────────`);
  console.log(`Accepted:      ${stats.accepted}${APPLY ? " (written)" : ""}`);
  console.log(`Needs review:  ${stats.review}${APPLY ? (INCLUDE_REVIEW ? " (written)" : " (held back)") : ""}`);
  console.log(`Rejected:      ${stats.rejected}${considered ? `  (${Math.round((stats.rejected / considered) * 100)}% of pages that answered)` : ""}`);
  console.log(`No answer:     ${stats.noAnswer}`);
  console.log(`No candidate:  ${stats.noCandidate}`);
  if (!APPLY && stats.accepted > 0) {
    console.log(`\nRe-run with --apply to save the ${stats.accepted} accepted rows.`);
    if (stats.review) console.log(`Add --include-review to also save the ${stats.review} held back.`);
  }

  await prisma.$disconnect();
}

main().catch(console.error);
