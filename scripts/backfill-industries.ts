/**
 * Backfill industry for well-known companies.
 *
 * Matches by slug first (exact), then falls back to name-based keyword rules
 * so it covers companies we didn't explicitly list.
 *
 * Usage:
 *   npx tsx scripts/backfill-industries.ts          # apply changes
 *   npx tsx scripts/backfill-industries.ts --dry-run # preview only
 */

import { config } from "dotenv";
config({ path: ".env.local" });
config();

import { PrismaClient } from "../src/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const adapter = new PrismaPg({
  connectionString: process.env.DIRECT_URL ?? process.env.DATABASE_URL!,
});
const prisma = new PrismaClient({ adapter });
const DRY_RUN = process.argv.includes("--dry-run");

// ─── Explicit slug → industry map ────────────────────────────────────────────
// Covers the curated companies visible in Crush's browse view.
// Add more here as the company list grows.

const SLUG_MAP: Record<string, string> = {
  // Artificial Intelligence
  "anthropic":           "Artificial Intelligence",
  "openai":              "Artificial Intelligence",
  "mistral":             "Artificial Intelligence",
  "mistral-ai":          "Artificial Intelligence",
  "cohere":              "Artificial Intelligence",
  "scale-ai":            "Artificial Intelligence",
  "xai":                 "Artificial Intelligence",
  "perplexity":          "Artificial Intelligence",
  "perplexity-ai":       "Artificial Intelligence",
  "hugging-face":        "Artificial Intelligence",
  "together-ai":         "Artificial Intelligence",
  "anyscale":            "Artificial Intelligence",
  "modal":               "Artificial Intelligence",
  "character-ai":        "Artificial Intelligence",
  "inflection-ai":       "Artificial Intelligence",
  "stability-ai":        "Artificial Intelligence",
  "runway":              "Artificial Intelligence",
  "midjourney":          "Artificial Intelligence",
  "elevenlabs":          "Artificial Intelligence",
  "adept":               "Artificial Intelligence",
  "imbue":               "Artificial Intelligence",
  "weaviate":            "Artificial Intelligence",
  "pinecone":            "Artificial Intelligence",
  "chroma":              "Artificial Intelligence",
  "weights-biases":      "Artificial Intelligence",
  "wandb":               "Artificial Intelligence",
  "replicate":           "Artificial Intelligence",
  "groq":                "Artificial Intelligence",
  "cerebras":            "Artificial Intelligence",
  "sambanova":           "Artificial Intelligence",
  "01-ai":               "Artificial Intelligence",

  // Developer Tools & Infrastructure
  "vercel":              "Developer Tools",
  "linear":              "Developer Tools",
  "github":              "Developer Tools",
  "gitlab":              "Developer Tools",
  "cursor":              "Developer Tools",
  "replit":              "Developer Tools",
  "retool":              "Developer Tools",
  "postman":             "Developer Tools",
  "render":              "Developer Tools",
  "railway":             "Developer Tools",
  "fly-io":              "Developer Tools",
  "supabase":            "Developer Tools",
  "planetscale":         "Developer Tools",
  "neon":                "Developer Tools",
  "turso":               "Developer Tools",
  "dbt-labs":            "Developer Tools",
  "hex":                 "Developer Tools",
  "metabase":            "Developer Tools",
  "grafana":             "Developer Tools",
  "grafana-labs":        "Developer Tools",
  "hashicorp":           "Developer Tools",
  "temporal":            "Developer Tools",
  "buf":                 "Developer Tools",
  "clerk":               "Developer Tools",
  "auth0":               "Developer Tools",
  "okta":                "Developer Tools",
  "launchdarkly":        "Developer Tools",
  "sentry":              "Developer Tools",
  "datadog":             "Developer Tools",
  "new-relic":           "Developer Tools",
  "pagerduty":           "Developer Tools",
  "incident-io":         "Developer Tools",
  "convex":              "Developer Tools",
  "liveblocks":          "Developer Tools",
  "tinybird":            "Developer Tools",
  "clickhouse":          "Developer Tools",

  // Cloud & Infrastructure
  "cloudflare":          "Cloud Infrastructure",
  "fastly":              "Cloud Infrastructure",
  "akamai":              "Cloud Infrastructure",
  "digitalocean":        "Cloud Infrastructure",
  "linode":              "Cloud Infrastructure",

  // Data & Analytics
  "databricks":          "Data & Analytics",
  "snowflake":           "Data & Analytics",
  "dbt-labs-2":          "Data & Analytics",
  "fivetran":            "Data & Analytics",
  "stitch":              "Data & Analytics",
  "airbyte":             "Data & Analytics",
  "hightouch":           "Data & Analytics",
  "census":              "Data & Analytics",
  "amplitude":           "Data & Analytics",
  "mixpanel":            "Data & Analytics",
  "segment":             "Data & Analytics",

  // Productivity & Collaboration
  "notion":              "Productivity",
  "figma":               "Design & Productivity",
  "airtable":            "Productivity",
  "coda":                "Productivity",
  "loom":                "Productivity",
  "miro":                "Productivity",
  "whimsical":           "Productivity",
  "linear-1":            "Productivity",
  "craft":               "Productivity",
  "superhuman":          "Productivity",
  "sanity":              "Productivity",

  // Fintech & Payments
  "stripe":              "Fintech",
  "plaid":               "Fintech",
  "ramp":                "Fintech",
  "brex":                "Fintech",
  "rippling":            "Fintech",
  "mercury":             "Fintech",
  "carta":               "Fintech",
  "robinhood":           "Fintech",
  "chime":               "Fintech",
  "affirm":              "Fintech",
  "klarna":              "Fintech",
  "checkout-com":        "Fintech",
  "marqeta":             "Fintech",
  "adyen":               "Fintech",

  // E-Commerce & Marketplace
  "shopify":             "E-Commerce",
  "faire":               "E-Commerce",
  "bolt":                "E-Commerce",
  "nacelle":             "E-Commerce",

  // Entertainment & Streaming
  "netflix":             "Entertainment",
  "spotify":             "Entertainment",
  "discord":             "Entertainment",
  "twitch":              "Entertainment",

  // Travel & Hospitality
  "airbnb":              "Travel & Hospitality",

  // Cybersecurity
  "crowdstrike":         "Cybersecurity",
  "wiz":                 "Cybersecurity",
  "snyk":                "Cybersecurity",
  "lacework":            "Cybersecurity",
  "orca-security":       "Cybersecurity",

  // Hardware & Semiconductors
  "nvidia":              "Hardware & Semiconductors",
  "arm":                 "Hardware & Semiconductors",
  "cerebras-systems":    "Hardware & Semiconductors",

  // Enterprise Software
  "salesforce":          "Enterprise Software",
  "servicenow":          "Enterprise Software",
  "workday":             "Enterprise Software",
  "zendesk":             "Enterprise Software",
  "intercom":            "Enterprise Software",
  "hubspot":             "Enterprise Software",
  "atlassian":           "Enterprise Software",
  "asana":               "Enterprise Software",
  "clickup":             "Enterprise Software",
  "monday-com":          "Enterprise Software",
  "lattice":             "Enterprise Software",
  "leapsome":            "Enterprise Software",
  "culture-amp":         "Enterprise Software",

  // Crypto & Web3
  "coinbase":            "Crypto & Web3",
  "opensea":             "Crypto & Web3",
  "alchemy":             "Crypto & Web3",
  "magic-eden":          "Crypto & Web3",
};

// ─── Keyword rules for name-based fallback ────────────────────────────────────
// Applied in order — first match wins.

const NAME_RULES: [RegExp, string][] = [
  [/\bai\b|artificial intelligence|machine learning|llm|gpt/i, "Artificial Intelligence"],
  [/\bcrypto\b|blockchain|web3|defi|nft/i,                     "Crypto & Web3"],
  [/\bpayment|fintech|banking|lending|insurtech|wealth/i,       "Fintech"],
  [/\bsecurity|cybersec|zero.?trust|soc\b/i,                   "Cybersecurity"],
  [/\bcloud\b|infrastructure|devops|platform|kubernetes/i,      "Cloud Infrastructure"],
  [/\banalytics|data warehouse|bi\b|business intelligence/i,    "Data & Analytics"],
  [/\bdeveloper|dev tool|sdk|api\b|open.?source/i,              "Developer Tools"],
  [/\bhealth|medical|clinical|pharma|biotech|genomic/i,         "Healthcare"],
  [/\bedtech|education|learning|tutoring/i,                     "EdTech"],
  [/\breal estate|proptech|property/i,                          "Real Estate"],
  [/\bcommerce|e.?commerce|retail|marketplace/i,                "E-Commerce"],
  [/\bstream|gaming|entertainment|media/i,                      "Entertainment"],
  [/\btravel|hospitality|hotel|flight/i,                        "Travel & Hospitality"],
  [/\bsemiconductor|chip|hardware|silicon/i,                    "Hardware & Semiconductors"],
  [/\blogistic|supply chain|shipping|freight/i,                 "Logistics"],
  [/\bhrtech|hr tech|talent|recruiting|payroll/i,               "HR & Recruiting"],
];

async function main() {
  // Load all companies without an industry
  const companies = await prisma.company.findMany({
    where: { industry: null },
    select: { id: true, name: true, slug: true, description: true, tags: true },
  });

  console.log(`Found ${companies.length} companies without industry\n`);

  const updates: { id: string; name: string; slug: string; industry: string; source: string }[] = [];

  for (const company of companies) {
    // 1. Try slug map (highest confidence)
    let industry = company.slug && Object.prototype.hasOwnProperty.call(SLUG_MAP, company.slug)
      ? SLUG_MAP[company.slug]
      : undefined;
    let source = "slug";

    // 2. Try name keyword rules
    if (!industry) {
      for (const [regex, label] of NAME_RULES) {
        if (regex.test(company.name) || (company.description && regex.test(company.description))) {
          industry = label;
          source = "name-rule";
          break;
        }
      }
    }

    if (industry) {
      updates.push({ id: company.id, name: company.name, slug: company.slug ?? "", industry, source });
    }
  }

  console.log(`Will update ${updates.length} companies:\n`);

  // Group by industry for readable output
  const byIndustry: Record<string, string[]> = {};
  for (const u of updates) {
    (byIndustry[u.industry] ??= []).push(`${u.name} (${u.source})`);
  }
  for (const [industry, names] of Object.entries(byIndustry).sort()) {
    console.log(`  ${industry} [${names.length}]`);
    if (names.length <= 10) names.forEach(n => console.log(`    • ${n}`));
  }

  if (DRY_RUN) {
    console.log("\n[DRY RUN] No changes written.");
  } else {
    console.log("\nApplying updates…");
    let done = 0;
    for (const u of updates) {
      await prisma.company.update({ where: { id: u.id }, data: { industry: u.industry } });
      done++;
      if (done % 50 === 0) process.stdout.write(`  ${done}/${updates.length}\r`);
    }
    console.log(`\nDone. Updated ${done} companies.`);
  }

  await prisma.$disconnect();
}

main().catch((e) => { console.error(e); process.exit(1); });
