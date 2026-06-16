/**
 * Backfill websites for curated companies (tracked / in collections / have a
 * hiring guide / ATS-sourced) that are missing one.
 *
 * Strategy: derive a candidate domain from the company name, then validate it
 * actually resolves over HTTPS before saving. Only domains that respond with
 * status < 400 are saved — wrong guesses are skipped, not written.
 *
 * Dry run (default):  npx tsx --env-file=.env.local scripts/backfill-websites.ts
 * Apply:              npx tsx --env-file=.env.local scripts/backfill-websites.ts --apply
 */
import { prisma } from "../src/lib/prisma";

const APPLY = process.argv.includes("--apply");
const CONCURRENCY = 12;
const TIMEOUT_MS = 6000;

// Clean a company name into a candidate domain label
function candidateDomain(name: string): string | null {
  const cleaned = name
    .toLowerCase()
    .replace(/\(.*?\)/g, "")                       // drop parentheticals
    .replace(/\b(inc|llc|corp|ltd|co|the|labs?|technologies|technology|software|group|agency|studio|alumni|job board)\b/g, "")
    .replace(/[^a-z0-9]/g, "");                     // strip everything non-alphanumeric
  if (cleaned.length < 2 || /^\d+$/.test(cleaned)) return null; // skip numeric/empty
  return `${cleaned}.com`;
}

async function resolves(domain: string): Promise<boolean> {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), TIMEOUT_MS);
  try {
    const res = await fetch(`https://${domain}`, {
      method: "HEAD",
      redirect: "follow",
      signal: ctrl.signal,
    });
    return res.status < 400;
  } catch {
    return false;
  } finally {
    clearTimeout(t);
  }
}

async function main() {
  const companies = await prisma.company.findMany({
    where: {
      website: null,
      OR: [
        { trackedBy: { some: {} } },
        { collections: { some: {} } },
        { insights: { some: {} } },
        { sourceType: { in: ["greenhouse", "lever", "ashby", "gem"] } },
      ],
    },
    select: { id: true, name: true },
  });

  console.log(`${companies.length} companies to check. Mode: ${APPLY ? "APPLY" : "DRY RUN"}\n`);

  let matched = 0, skipped = 0, noCandidate = 0;

  // Process in batches for bounded concurrency
  for (let i = 0; i < companies.length; i += CONCURRENCY) {
    const batch = companies.slice(i, i + CONCURRENCY);
    await Promise.all(batch.map(async (c) => {
      const domain = candidateDomain(c.name);
      if (!domain) { noCandidate++; return; }
      const ok = await resolves(domain);
      if (ok) {
        matched++;
        console.log(`✓ ${c.name} → https://${domain}`);
        if (APPLY) {
          await prisma.company.update({ where: { id: c.id }, data: { website: `https://${domain}` } });
        }
      } else {
        skipped++;
      }
    }));
  }

  console.log(`\nDone. Matched: ${matched} | Skipped (no resolve): ${skipped} | No candidate: ${noCandidate}`);
  if (!APPLY && matched > 0) console.log("\nRe-run with --apply to save these.");
  await prisma.$disconnect();
}

main().catch(console.error);
