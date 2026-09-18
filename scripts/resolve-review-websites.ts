/**
 * Second pass over backfill-websites.ts's "review" tier: companies whose
 * guessed domain resolved and named itself on the page, but the name is
 * also an ordinary English word (Workday, Wish, Zero…), so plain string
 * matching can't tell "this is the real company" from "this is some
 * unrelated site that happens to share the word." An LLM can — it knows
 * Workday is a well-known HR/finance SaaS company and can weigh that
 * against the page title, the same way a human reviewer would.
 *
 * Re-derives the review tier rather than trusting the original run's log:
 * narrows to common-word names locally, re-runs classify() on those, then
 * asks Haiku, per company, for a confident yes/no. Confident matches get
 * written (with --apply); the rest are printed for manual review — this
 * pass narrows the pile, it doesn't try to clear it to zero.
 *
 * Dry run:  npx tsx --env-file=.env.local scripts/resolve-review-websites.ts
 * Apply:    npx tsx --env-file=.env.local scripts/resolve-review-websites.ts --apply
 */
import Anthropic from "@anthropic-ai/sdk";
import { prisma } from "../src/lib/prisma";
import { classify, isCommonWord, nameStem, type Outcome } from "./backfill-websites";

const APPLY = process.argv.includes("--apply");
const CONCURRENCY = 5;

let _anthropic: Anthropic | null = null;
function getAnthropic(): Anthropic {
  if (!_anthropic) _anthropic = new Anthropic();
  return _anthropic;
}

type Company = {
  id: string;
  name: string;
  description: string | null;
  industry: string | null;
  headquarters: string | null;
  tags: string[];
  sourceType: string;
};

async function judge(
  company: Company,
  outcome: Extract<Outcome, { kind: "review" }>,
): Promise<{ confident: boolean; reasoning: string }> {
  const context = [
    company.description && `Description on file: ${company.description}`,
    company.industry && `Industry on file: ${company.industry}`,
    company.headquarters && `Headquarters on file: ${company.headquarters}`,
    company.tags.length > 0 && `Tags on file: ${company.tags.join(", ")}`,
    `Added via: ${company.sourceType}`,
  ].filter(Boolean).join("\n") || "No other context on file — this company was likely added with just a name.";

  let response;
  try {
    response = await getAnthropic().messages.create({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 300,
      messages: [{
        role: "user",
        content: `We're backfilling a website for a company in our database. We guessed a domain from the company name and it resolved, but the company name is also an ordinary English word, so we can't tell from string matching alone whether the page belongs to THIS company or to some unrelated site that happens to share the word.

Company name: ${company.name}
${context}

Guessed domain: ${outcome.via}
Final URL after redirects: ${outcome.website}
Page <title>: ${outcome.title}
Page og:site_name: ${outcome.siteName || "(none)"}

Use what you know about real companies (and the context on file, if any) to judge: is this almost certainly the official website of "${company.name}" the company we have in our database? Say no if you don't recognize a company by this name/description matching this page, if the page could plausibly belong to a different, unrelated company or product with the same name, or if you're genuinely unsure.

Return ONLY valid JSON, no markdown, no explanation:
{
  "confident": boolean,
  "reasoning": string — one short sentence
}`,
      }],
    });
  } catch {
    return { confident: false, reasoning: "API call failed" };
  }

  const raw = response.content[0]?.type === "text" ? response.content[0].text : "";
  const jsonText = raw.trim().replace(/^```(?:json)?\s*/i, "").replace(/```\s*$/, "").trim();
  try {
    const parsed = JSON.parse(jsonText);
    return { confident: !!parsed.confident, reasoning: String(parsed.reasoning ?? "") };
  } catch {
    return { confident: false, reasoning: "unparseable response" };
  }
}

async function main() {
  const missing = await prisma.company.findMany({
    where: { website: null },
    select: { id: true, name: true, description: true, industry: true, headquarters: true, tags: true, sourceType: true },
    orderBy: { name: "asc" },
  });

  // classify() only ever returns "review" for a single-token dictionary-word
  // name, and that test is local and free — so apply it here rather than
  // paying four HTTP probes per company to rediscover it. Lossless: every
  // company dropped by this filter is one classify() could not have flagged.
  const companies = missing.filter((c) => {
    const stem = nameStem(c.name);
    return stem !== null && isCommonWord(c.name, stem);
  });

  console.log(
    `${missing.length} companies still missing a website; ` +
    `${companies.length} have a common-word name worth re-checking. ` +
    `Mode: ${APPLY ? "APPLY" : "DRY RUN"}\n`
  );

  const stats = { confirmed: 0, stillReview: 0, noLongerReview: 0 };
  const stillReview: string[] = [];

  for (let i = 0; i < companies.length; i += CONCURRENCY) {
    const batch = companies.slice(i, i + CONCURRENCY);
    await Promise.all(
      batch.map(async (c) => {
        const outcome = await classify(c.name);
        if (outcome.kind !== "review") {
          stats.noLongerReview++;
          return;
        }

        const verdict = await judge(c, outcome);
        if (verdict.confident) {
          stats.confirmed++;
          console.log(`✓ ${c.name.padEnd(28)} → ${outcome.website.padEnd(34)} ${verdict.reasoning}`);
          if (APPLY) {
            await prisma.company.update({ where: { id: c.id }, data: { website: outcome.website } });
          }
        } else {
          stats.stillReview++;
          stillReview.push(
            `  ? ${c.name.padEnd(28)} → ${outcome.website.padEnd(34)} "${outcome.title.slice(0, 45)}"  — ${verdict.reasoning}`,
          );
        }
      }),
    );
  }

  if (stillReview.length) {
    console.log(`\n── Still needs manual review ──`);
    for (const r of stillReview) console.log(r);
  }

  console.log(`\n───────────────────────────────`);
  console.log(`Confirmed by AI: ${stats.confirmed}${APPLY ? " (written)" : ""}`);
  console.log(`Still review:    ${stats.stillReview}`);
  console.log(`Dropped out of the review tier this run: ${stats.noLongerReview}`);
  if (!APPLY && stats.confirmed > 0) {
    console.log(`\nRe-run with --apply to save the ${stats.confirmed} confirmed rows.`);
  }

  await prisma.$disconnect();
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(console.error);
}
