/**
 * Manually adds portfolio companies for VCs whose portfolio pages couldn't be
 * scraped automatically (JS-only, Cloudflare-blocked, or no public page).
 *
 * Sources: Lightspeed, General Catalyst, Tiger Global, Benchmark, GGV Capital,
 *          First Round, Coatue, IVP, Redpoint
 *
 * Usage:
 *   npx tsx scripts/add-vc-manual-portfolios.ts
 *   npx tsx scripts/add-vc-manual-portfolios.ts --dry-run
 *   npx tsx scripts/add-vc-manual-portfolios.ts --vc lightspeed
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

const args = process.argv.slice(2);
const DRY_RUN = args.includes("--dry-run");
const VC_FILTER = (() => {
  const i = args.indexOf("--vc");
  return i !== -1 ? args[i + 1] : null;
})();

function toSlug(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 80);
}

async function sleep(ms: number) {
  return new Promise<void>((r) => setTimeout(r, ms));
}

async function upsertWithTag(name: string, tag: string): Promise<"created" | "tagged" | "skipped"> {
  const slug = toSlug(name);
  const existing = await prisma.company.findFirst({
    where: { OR: [{ slug }, { name: { equals: name, mode: "insensitive" } }] },
    select: { id: true, tags: true },
  });

  if (existing) {
    if (existing.tags.includes(tag)) return "skipped";
    await prisma.company.update({
      where: { id: existing.id },
      data: { tags: [...existing.tags, tag] },
    });
    return "tagged";
  }

  try {
    await prisma.company.create({
      data: { name, slug, sourceType: "manual", tags: [tag] },
    });
    return "created";
  } catch {
    const collision = await prisma.company.findUnique({ where: { slug }, select: { id: true, tags: true } });
    if (collision && !collision.tags.includes(tag)) {
      await prisma.company.update({
        where: { id: collision.id },
        data: { tags: [...collision.tags, tag] },
      });
      return "tagged";
    }
    return "skipped";
  }
}

async function addPortfolio(label: string, tag: string, names: string[]): Promise<void> {
  console.log(`\n── ${label} ${"─".repeat(Math.max(0, 52 - label.length))}`);
  console.log(`  ${names.length} companies`);

  if (DRY_RUN) {
    console.log(`  Done: ${names.length} created (dry run)`);
    return;
  }

  let created = 0, tagged = 0, skipped = 0, errors = 0;
  const seen = new Set<string>();

  for (const raw of names) {
    const name = raw.trim();
    if (!name || seen.has(name.toLowerCase())) continue;
    seen.add(name.toLowerCase());

    try {
      const r = await upsertWithTag(name, tag);
      if (r === "created") created++;
      else if (r === "tagged") tagged++;
      else skipped++;
    } catch {
      errors++;
    }
    await sleep(5);
  }

  console.log(`  Done: ${created} created, ${tagged} tagged existing, ${skipped} skipped, ${errors} errors`);
}

// ── Portfolio lists ───────────────────────────────────────────────────────────

const PORTFOLIOS: Array<{ key: string; label: string; tag: string; companies: string[] }> = [

  {
    key: "lightspeed",
    label: "Lightspeed Venture Partners",
    tag: "Lightspeed",
    companies: [
      "1047 Games", "1Password", "Abata Therapeutics", "Abridge", "Abstract",
      "Acceldata", "Acko", "Aerohive", "Affirmed Networks", "Affirm", "Air Doctor",
      "Airbound", "Alchemy", "Aledade", "Alif Semiconductor", "All Day Technologies",
      "Alloy", "Almanac Health", "Alooma", "Amca", "Ancora Biotech", "Anduril",
      "Antares Therapeutics", "Anthropic", "Apex.AI", "Apna", "AppDynamics",
      "AppZen", "Aqua Security", "aquant", "Aquantia", "Arbor Networks", "Archive",
      "Arena", "Arctic Wolf", "Aspire", "Assort Health", "At-Bay", "Athos",
      "Audiomob", "Audius", "Augment", "Autograph", "Avamar", "Avere Systems",
      "Axonius", "Bachatt", "Balance", "Barefoot Networks", "Base Power", "beehiiv",
      "Beek", "Believer", "BetterUp", "Beyond Odds Technologies", "Bhanzu",
      "Big Sur AI", "Blameless", "Blend", "BloomReach", "Blue Nile", "BlueVine",
      "Bonobos", "Bridgetown Research", "Brigit", "Brocade", "Bromium",
      "Building Connected", "Buildots", "Byju's", "Calm", "Cameo", "Carta",
      "Cartesia", "Castelion", "Cato Networks", "Celona", "Certik", "Chainguard",
      "Character.AI", "Ciena", "Clark", "ClickHouse", "ClickUp", "CloudBees",
      "Cohere Technologies", "Composio", "Cyera", "Daily Harvest", "Darwinbox",
      "Databricks", "DataStax", "Delphix", "Descope", "Dexterity", "Distyl",
      "Docker", "Dremio", "Dukaan", "Eightfold", "ElevenLabs", "Enable",
      "Endor Labs", "Endowus", "Epic Games", "Exabeam", "Exponent Energy",
      "ezcater", "Faire", "FalconX", "Farther", "Fathom", "Fiddler", "Finaloop",
      "Finix", "Fireworks AI", "FiveStars", "Glean", "Grab", "Grafana", "Granola",
      "GrubHub", "Guardant Health", "Handshake", "Hasura", "Helion", "Helsing",
      "Highfive", "Homary", "Hook", "Hungryroot", "Illumix", "Informatica",
      "Innovaccer", "Inworld AI", "Intenseye", "Joopiter", "k-ID", "K2 Space",
      "karius", "Ketryx", "Kikoff", "Kiva Software", "Kodiak AI", "Kongregate",
      "Kumospace", "Ladder", "Langfuse", "LedgerX", "Level", "Lightyear",
      "Lunchclub", "Magic Eden", "Magic Spoon", "MagicPin", "Matillion",
      "Mistral AI", "Moveworks", "Multiverse", "Navan", "Nest", "Noname Security",
      "Nutanix", "Offchain Labs", "Payhawk", "Personio", "Pika", "Resilience",
      "Rubrik", "ScaleOps", "Skild AI", "Snap", "Snorkel AI", "Stripe",
      "ThoughtSpot", "Typeface", "Ultima Genomics", "Vinted", "Wiz", "Yugabyte",
      "Zola", "Gainsight", "Fusion-IO", "Flockjay", "Exa", "EvenUp", "Evolv",
      "eHealth", "Everyrealm", "Epsagon", "Fairatmos", "DataFleets", "Datorama",
    ],
  },

  {
    key: "gc",
    label: "General Catalyst",
    tag: "General Catalyst",
    companies: [
      "Airbnb", "Anduril", "Anthropic", "Applied Intuition", "Commure",
      "Figma", "Helsing", "Hippocratic AI", "Legora", "Maven", "Mercor",
      "Ramp", "Ro", "Stripe", "Vercel", "Zepto", "Agora", "Aidoc",
      "AirSlate", "Alinea Health", "Allego", "Altos Labs", "Amperity",
      "Beacon", "beautiful.ai", "BirdBuddy", "Birches Health", "Bolna",
      "Castelion", "Chai Discovery", "Chainguard", "CookUnity", "Coolant",
      "Drata", "Dryft", "Electio", "Eyebot", "Fragment", "General Intuition",
      "Geordie", "Greenboard", "ICEYE", "Kite", "Langdock", "Leona",
      "Lucis", "Menlo Security", "Meter", "Mira", "Modal", "Moda",
      "Native Security", "Nexus", "Nolla Health", "Pallet", "Pantomath",
      "Paradigm", "Pelico", "Prepared", "Prime Meridian", "Pronto",
      "Radial", "Re:Build", "Relay", "Sage Care", "Scalar", "Senra Systems",
      "Serval", "Slide", "Spiral", "Stilla", "Strawberry", "Substrate",
      "Tahoe Therapeutics", "TaleMonster Games", "Taurus", "Titan",
      "Twenty", "Valerie Health", "Vercel", "Vulcan Technologies",
      "WellTheory", "Yuzu Health", "Zepto",
    ],
  },

  {
    key: "tigerglobal",
    label: "Tiger Global",
    tag: "Tiger Global",
    companies: [
      "Alibaba", "Blank Street Coffee", "Block", "ByteDance", "Carta",
      "Coinbase", "Credit Karma", "Databricks", "Facebook", "Flipkart",
      "Glassdoor", "JD.com", "Kajabi", "LinkedIn", "Nextdoor", "Nubank",
      "Papaya Global", "Quora", "Quicknode", "Scribe", "SenseTime",
      "Spotify", "Stripe", "strongDM", "UiPath", "Waymo", "Yandex",
      "Freshworks", "Peloton", "Robinhood", "Trade Desk", "CRED",
      "Meesho", "Razorpay", "Pharmeasy", "Groww", "OYO", "Dream11",
      "ShareChat", "Slice", "Unacademy", "Vedantu", "BrowserStack",
      "Chargebee", "Postman", "Zenoti",
    ],
  },

  {
    key: "benchmark",
    label: "Benchmark",
    tag: "Benchmark",
    companies: [
      "Uber", "Twitter", "Snapchat", "Instagram", "Yelp", "WeWork",
      "Stitch Fix", "eBay", "Zendesk", "Quora", "Discord", "OpenTable",
      "TaskRabbit", "Poshmark", "Riot Games", "Duo Security", "SurveyMonkey",
      "Juniper Networks", "Ariba", "1-800-Flowers", "Friendster", "Nextdoor",
      "Asana", "New Relic", "Coda", "Guild Education", "Niantic",
      "Elastic", "Tinder", "Bumble", "Drizly", "Evolent Health",
      "Contentsquare", "Amplitude", "Consensus", "Metronome", "Retool",
      "Codeium", "Docusign", "Wolt",
    ],
  },

  {
    key: "ggv",
    label: "GGV Capital (Notable Capital)",
    tag: "GGV",
    companies: [
      "Affirm", "Airbnb", "Anthropic", "Browserbase", "Drata",
      "Fal", "Georgie", "Handshake", "HashiCorp", "Ibotta", "Neon",
      "Nozomi Networks", "Orca Security", "Poshmark", "Quince",
      "RedNote", "Slack", "Square", "TikTok", "Vercel", "Wispr",
      "Wish", "Zendesk", "dLocal", "Blend", "Opendoor", "Grindr",
      "Peloton", "Lime", "Pendo", "Xometry", "Flink",
    ],
  },

  {
    key: "firstround",
    label: "First Round Capital",
    tag: "First Round",
    companies: [
      "Notion", "Clay", "Pomelo Care", "Roblox", "K2 Space", "Square",
      "Looker", "Fal", "Loyal", "Upstart", "Prepared", "Uber",
      "Verkada", "Flatiron Health", "Persona", "EvolutionIQ", "Gumloop",
      "Flexport", "Clover Health", "Omni", "Assort Health",
      "Warby Parker", "Birchbox", "Refinery29", "Hotel Tonight",
      "Mint", "App Annie", "Viv Labs", "Periscope", "StyleSeat",
      "One Medical", "Lob", "Invision", "Ethos", "Canopy Tax",
      "Jopwell", "Birdies", "Carter", "Solugen",
    ],
  },

  {
    key: "coatue",
    label: "Coatue Management",
    tag: "Coatue",
    companies: [
      "Abacus.AI", "Agora", "AI21 Labs", "Airbyte", "Airtable",
      "Anaplan", "Anduril", "Ankorstore", "Ant Group", "Anthropic",
      "Applied Intuition", "AppZen", "Artsy", "Attentive", "Aurora Solar",
      "BeReal", "BharatPe", "Bigeye", "BitDeer", "Bitso", "Blend",
      "Bond", "Boost Insurance", "Box", "Braintrust", "Butterflies AI",
      "ByteDance", "Chime", "Checkout.com", "Coda", "Confluent",
      "Coursera", "DoorDash", "Duolingo", "Figma", "GitHub", "Gong",
      "Instacart", "Klarna", "Lyft", "Meesho", "Navan", "OYO",
      "Pendo", "Plaid", "Postman", "Razorpay", "Rippling", "Roblox",
      "Robinhood", "Scale AI", "Snowflake", "Stripe", "TikTok",
      "Twilio", "Uber", "UiPath", "Unity", "Wolt", "Zendesk",
    ],
  },

  {
    key: "ivp",
    label: "IVP (Institutional Venture Partners)",
    tag: "IVP",
    companies: [
      "Abridge", "Accompany Health", "Aiven", "Ajaib", "Aledade",
      "Anomali", "AppDynamics", "Appcharge", "Attentive", "Baseten",
      "Business Insider", "Cape", "Care.com", "Casper", "Chainguard",
      "Checkr", "CircleCI", "Clipboard Health", "Clickhouse", "Coinbase",
      "Compass", "Cortex", "Cradle", "Cribl", "Curology", "Data.ai",
      "Datalogix", "Dataminr", "DeepL", "Discord", "Domo", "Dream Games",
      "Dropbox", "Eightfold", "Expanse", "Figma", "Fightcamp", "Found",
      "G2", "Gamma", "Giphy", "GitHub", "Glean", "Glassdoor",
      "Glossier", "Grammarly", "Groundtruth", "H1", "Harness",
      "Hashicorp", "Hello Heart", "Hims & Hers", "HomeAway", "Humu",
      "IEX", "Indiegogo", "Inspirato", "Jasper", "Kalshi", "Kittl",
      "Klarna", "Langchain", "Laurel", "Legalzoom", "LifeLock",
      "Lime", "Lumafield", "Lulus", "Lyra Health", "Marketo",
      "Mindbody", "Monte Carlo Data", "Motive", "Mulesoft", "Netflix",
      "Nerdwallet", "Nextdoor", "Nextroll", "Niantic", "Numeric",
      "Obsidian Security", "OnDeck Capital", "Oportun", "Papaya Global",
      "Paper", "Perplexity", "Personal Capital", "Pigment", "Pindrop",
      "Podium", "Productiv", "Prosper", "Pure Storage", "Robinhood",
      "Roam", "Sage", "Seon", "Slack", "SoFi", "Solace Health",
      "Sorare", "Soundcloud", "SteelBrick", "Sublime Security",
      "Sumo Logic", "Supercell", "Superhuman", "Supermetrics",
      "TAXbit", "Tanium", "Tennr", "The Honest Company", "TuneIn",
      "Twitter", "UiPath", "Uber", "Venice", "Vercel", "Veriff",
      "Volt", "Voxer", "Whip Media Group", "Whoop", "Yellowbrick Data",
      "Yext", "Zendesk", "Zenefits", "ZEFR", "ZipRecruiter", "Zerto",
      "Zynga", "ngMoco",
    ],
  },

  {
    key: "redpoint",
    label: "Redpoint Ventures",
    tag: "Redpoint",
    companies: [
      "9flats", "AppZen", "Arista", "Gradient Labs", "HashiCorp",
      "Netflix", "Owner.com", "Snowflake", "Stripe", "Ramp", "Twilio",
      "NorthOne", "Scribe", "Heroku", "Zuora", "Looker", "Tipalti",
      "Domo", "AppDynamics", "Zendesk", "SurveyMonkey", "Instructure",
      "MyFitnessPal", "ForUsAll", "AuditBoard", "Electric Imp",
      "Whisk", "NS1", "Druid", "Bugsnag", "Homebase", "Launchpad",
      "Laguna Health", "Coil", "Tonal", "Expensify", "Replicated",
      "Netlify", "Metronome",
    ],
  },
];

async function main() {
  if (DRY_RUN) console.log("DRY RUN — no DB writes\n");

  const sources = VC_FILTER
    ? PORTFOLIOS.filter((p) => p.key === VC_FILTER)
    : PORTFOLIOS;

  if (sources.length === 0) {
    const keys = PORTFOLIOS.map((p) => p.key).join(", ");
    console.error(`Unknown --vc value. Valid options: ${keys}`);
    process.exit(1);
  }

  console.log(`Adding manual VC portfolios (${sources.length} source(s))\n`);

  for (const source of sources) {
    await addPortfolio(source.label, source.tag, source.companies);
  }

  const total = await prisma.company.count();
  console.log(`\nTotal companies in DB: ${total.toLocaleString()}`);
  await prisma.$disconnect();
}

main().catch(async (e) => {
  console.error(e);
  await prisma.$disconnect();
  process.exit(1);
});
