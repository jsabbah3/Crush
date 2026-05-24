import { config } from "dotenv";
config({ path: ".env.local" });
config();

import { PrismaClient } from "../src/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const adapter = new PrismaPg({ connectionString: process.env.DIRECT_URL ?? process.env.DATABASE_URL! });
const prisma = new PrismaClient({ adapter });

type CompanyInput = {
  name: string;
  slug: string;
  description?: string;
  website?: string;
  industry?: string;
  headquarters?: string;
  sourceType?: "greenhouse" | "lever" | "ashby" | "manual";
  sourceId?: string;
};

const companies: CompanyInput[] = [
  // ── AI ────────────────────────────────────────────────────────────────────
  {
    name: "Anthropic", slug: "anthropic",
    description: "AI safety company building reliable, interpretable, and steerable AI systems.",
    website: "https://anthropic.com", industry: "AI", headquarters: "San Francisco, CA",
    sourceType: "greenhouse", sourceId: "anthropic",
  },
  {
    name: "OpenAI", slug: "openai",
    description: "AI research and deployment company behind ChatGPT and GPT-4.",
    website: "https://openai.com", industry: "AI", headquarters: "San Francisco, CA",
    sourceType: "greenhouse", sourceId: "openai",
  },
  {
    name: "Scale AI", slug: "scale-ai",
    description: "Data platform accelerating AI development for enterprise and government.",
    website: "https://scale.com", industry: "AI", headquarters: "San Francisco, CA",
    sourceType: "greenhouse", sourceId: "scaleai",
  },
  {
    name: "Hugging Face", slug: "hugging-face",
    description: "The AI community building the future of machine learning.",
    website: "https://huggingface.co", industry: "AI", headquarters: "New York, NY",
    sourceType: "greenhouse", sourceId: "huggingface",
  },
  {
    name: "Databricks", slug: "databricks",
    description: "Data and AI platform built on the lakehouse architecture.",
    website: "https://databricks.com", industry: "Data & AI", headquarters: "San Francisco, CA",
    sourceType: "greenhouse", sourceId: "databricks",
  },
  {
    name: "Mistral", slug: "mistral",
    description: "European frontier AI company building the best open models.",
    website: "https://mistral.ai", industry: "AI", headquarters: "Paris, France",
    sourceType: "greenhouse", sourceId: "mistral",
  },
  {
    name: "Cohere", slug: "cohere",
    description: "Enterprise AI platform for language understanding and generation.",
    website: "https://cohere.com", industry: "AI", headquarters: "Toronto, Canada",
    sourceType: "ashby", sourceId: "cohere",
  },
  {
    name: "Perplexity", slug: "perplexity",
    description: "AI-powered answer engine that searches and reasons over the web.",
    website: "https://perplexity.ai", industry: "AI", headquarters: "San Francisco, CA",
    sourceType: "ashby", sourceId: "perplexity",
  },
  {
    name: "xAI", slug: "xai",
    description: "Elon Musk's AI company building Grok, with a mission to understand the universe.",
    website: "https://x.ai", industry: "AI", headquarters: "San Francisco, CA",
    sourceType: "greenhouse", sourceId: "xai",
  },
  {
    name: "Cursor", slug: "cursor",
    description: "AI-powered code editor built to make developers extraordinarily productive.",
    website: "https://cursor.com", industry: "Developer Tools", headquarters: "San Francisco, CA",
    sourceType: "ashby", sourceId: "anysphere",
  },
  {
    name: "Runway", slug: "runway",
    description: "Applied AI research company building next-generation creative tools.",
    website: "https://runwayml.com", industry: "AI", headquarters: "New York, NY",
    sourceType: "ashby", sourceId: "runway",
  },
  {
    name: "ElevenLabs", slug: "elevenlabs",
    description: "AI voice platform making content universally accessible in any language.",
    website: "https://elevenlabs.io", industry: "AI", headquarters: "New York, NY",
    sourceType: "ashby", sourceId: "elevenlabs",
  },
  {
    name: "Weights & Biases", slug: "weights-biases",
    description: "MLOps platform for tracking, visualizing, and reproducing machine learning experiments.",
    website: "https://wandb.ai", industry: "AI", headquarters: "San Francisco, CA",
    sourceType: "greenhouse", sourceId: "wandb",
  },

  // ── Developer Tools ───────────────────────────────────────────────────────
  {
    name: "Vercel", slug: "vercel",
    description: "Platform for frontend developers to build and deploy fast web apps.",
    website: "https://vercel.com", industry: "Developer Tools", headquarters: "San Francisco, CA",
    sourceType: "lever", sourceId: "vercel",
  },
  {
    name: "Linear", slug: "linear",
    description: "Project management tool built for modern software teams.",
    website: "https://linear.app", industry: "Developer Tools", headquarters: "San Francisco, CA",
    sourceType: "lever", sourceId: "linear",
  },
  {
    name: "GitHub", slug: "github",
    description: "Developer platform for hosting and collaborating on code.",
    website: "https://github.com", industry: "Developer Tools", headquarters: "San Francisco, CA",
    sourceType: "greenhouse", sourceId: "github",
  },
  {
    name: "Supabase", slug: "supabase",
    description: "Open source Firebase alternative built on Postgres.",
    website: "https://supabase.com", industry: "Developer Tools", headquarters: "San Francisco, CA",
    sourceType: "ashby", sourceId: "supabase",
  },
  {
    name: "Retool", slug: "retool",
    description: "Low-code platform for building internal tools and business apps.",
    website: "https://retool.com", industry: "Developer Tools", headquarters: "San Francisco, CA",
    sourceType: "greenhouse", sourceId: "retool",
  },
  {
    name: "Figma", slug: "figma",
    description: "Collaborative design platform for UI/UX designers and teams.",
    website: "https://figma.com", industry: "Design Tools", headquarters: "San Francisco, CA",
    sourceType: "greenhouse", sourceId: "figma",
  },
  {
    name: "Warp", slug: "warp",
    description: "AI-powered terminal built for developer productivity.",
    website: "https://warp.dev", industry: "Developer Tools", headquarters: "New York, NY",
    sourceType: "ashby", sourceId: "warp",
  },
  {
    name: "Datadog", slug: "datadog",
    description: "Monitoring and security platform for cloud applications.",
    website: "https://datadoghq.com", industry: "Developer Tools", headquarters: "New York, NY",
    sourceType: "greenhouse", sourceId: "datadog",
  },
  {
    name: "Sentry", slug: "sentry",
    description: "Application monitoring platform that helps developers fix errors in real time.",
    website: "https://sentry.io", industry: "Developer Tools", headquarters: "San Francisco, CA",
    sourceType: "greenhouse", sourceId: "sentry",
  },
  {
    name: "MongoDB", slug: "mongodb",
    description: "Document database platform for modern applications.",
    website: "https://mongodb.com", industry: "Developer Tools", headquarters: "New York, NY",
    sourceType: "greenhouse", sourceId: "mongodb",
  },
  {
    name: "Grafana Labs", slug: "grafana-labs",
    description: "Open and composable observability platform used by millions of engineers.",
    website: "https://grafana.com", industry: "Developer Tools", headquarters: "New York, NY",
    sourceType: "lever", sourceId: "grafana",
  },
  {
    name: "Postman", slug: "postman",
    description: "API platform for building and using APIs, used by 35M+ developers.",
    website: "https://postman.com", industry: "Developer Tools", headquarters: "San Francisco, CA",
    sourceType: "greenhouse", sourceId: "postman",
  },
  {
    name: "LaunchDarkly", slug: "launchdarkly",
    description: "Feature management platform for safe and fast software delivery.",
    website: "https://launchdarkly.com", industry: "Developer Tools", headquarters: "Oakland, CA",
    sourceType: "lever", sourceId: "launchdarkly",
  },
  {
    name: "Twilio", slug: "twilio",
    description: "Cloud communications platform for SMS, voice, video, and email APIs.",
    website: "https://twilio.com", industry: "Developer Tools", headquarters: "San Francisco, CA",
    sourceType: "greenhouse", sourceId: "twilio",
  },

  // ── Infrastructure ────────────────────────────────────────────────────────
  {
    name: "Cloudflare", slug: "cloudflare",
    description: "Global network platform providing security, performance, and reliability.",
    website: "https://cloudflare.com", industry: "Infrastructure", headquarters: "San Francisco, CA",
    sourceType: "greenhouse", sourceId: "cloudflare",
  },
  {
    name: "HashiCorp", slug: "hashicorp",
    description: "Infrastructure automation tools including Terraform and Vault.",
    website: "https://hashicorp.com", industry: "Infrastructure", headquarters: "San Francisco, CA",
    sourceType: "greenhouse", sourceId: "hashicorp",
  },
  {
    name: "Fly.io", slug: "fly-io",
    description: "Platform for running full-stack apps and databases close to users globally.",
    website: "https://fly.io", industry: "Infrastructure", headquarters: "Chicago, IL",
    sourceType: "lever", sourceId: "fly",
  },
  {
    name: "Confluent", slug: "confluent",
    description: "Data streaming platform built on Apache Kafka for real-time applications.",
    website: "https://confluent.io", industry: "Infrastructure", headquarters: "Mountain View, CA",
    sourceType: "greenhouse", sourceId: "confluent",
  },
  {
    name: "Elastic", slug: "elastic",
    description: "Search and observability company behind Elasticsearch and the ELK stack.",
    website: "https://elastic.co", industry: "Infrastructure", headquarters: "Mountain View, CA",
    sourceType: "greenhouse", sourceId: "elastic",
  },
  {
    name: "Snowflake", slug: "snowflake",
    description: "Cloud data platform enabling data sharing, analytics, and AI at scale.",
    website: "https://snowflake.com", industry: "Data & AI", headquarters: "Bozeman, MT",
    sourceType: "greenhouse", sourceId: "snowflake",
  },

  // ── Fintech ───────────────────────────────────────────────────────────────
  {
    name: "Stripe", slug: "stripe",
    description: "Financial infrastructure platform for the internet.",
    website: "https://stripe.com", industry: "Fintech", headquarters: "San Francisco, CA",
    sourceType: "greenhouse", sourceId: "stripe",
  },
  {
    name: "Brex", slug: "brex",
    description: "Financial services and software for startups and enterprises.",
    website: "https://brex.com", industry: "Fintech", headquarters: "San Francisco, CA",
    sourceType: "greenhouse", sourceId: "brex",
  },
  {
    name: "Plaid", slug: "plaid",
    description: "Financial data network powering fintech apps and open banking.",
    website: "https://plaid.com", industry: "Fintech", headquarters: "San Francisco, CA",
    sourceType: "greenhouse", sourceId: "plaid",
  },
  {
    name: "Robinhood", slug: "robinhood",
    description: "Commission-free investing app democratizing access to financial markets.",
    website: "https://robinhood.com", industry: "Fintech", headquarters: "Menlo Park, CA",
    sourceType: "greenhouse", sourceId: "robinhood",
  },
  {
    name: "Coinbase", slug: "coinbase",
    description: "The leading cryptocurrency exchange and Web3 platform.",
    website: "https://coinbase.com", industry: "Fintech", headquarters: "San Francisco, CA",
    sourceType: "greenhouse", sourceId: "coinbase",
  },
  {
    name: "Mercury", slug: "mercury",
    description: "Banking built for startups, with powerful financial tools.",
    website: "https://mercury.com", industry: "Fintech", headquarters: "San Francisco, CA",
    sourceType: "greenhouse", sourceId: "mercury",
  },
  {
    name: "Ramp", slug: "ramp",
    description: "Corporate card and spend management platform saving companies money.",
    website: "https://ramp.com", industry: "Fintech", headquarters: "New York, NY",
    sourceType: "greenhouse", sourceId: "ramp",
  },
  {
    name: "Rippling", slug: "rippling",
    description: "HR, IT, and finance platform for managing employees and contractors.",
    website: "https://rippling.com", industry: "HR Tech", headquarters: "San Francisco, CA",
    sourceType: "greenhouse", sourceId: "rippling",
  },
  {
    name: "Affirm", slug: "affirm",
    description: "Buy now, pay later platform offering transparent, interest-free financing.",
    website: "https://affirm.com", industry: "Fintech", headquarters: "San Francisco, CA",
    sourceType: "greenhouse", sourceId: "affirm",
  },
  {
    name: "Chime", slug: "chime",
    description: "Fee-free mobile banking app with early direct deposit and savings tools.",
    website: "https://chime.com", industry: "Fintech", headquarters: "San Francisco, CA",
    sourceType: "greenhouse", sourceId: "chime",
  },
  {
    name: "Carta", slug: "carta",
    description: "Equity management platform for startups, investors, and employees.",
    website: "https://carta.com", industry: "Fintech", headquarters: "San Francisco, CA",
    sourceType: "greenhouse", sourceId: "carta",
  },

  // ── Cybersecurity ─────────────────────────────────────────────────────────
  {
    name: "CrowdStrike", slug: "crowdstrike",
    description: "Cloud-native endpoint security and threat intelligence platform.",
    website: "https://crowdstrike.com", industry: "Cybersecurity", headquarters: "Austin, TX",
    sourceType: "greenhouse", sourceId: "crowdstrike",
  },
  {
    name: "Okta", slug: "okta",
    description: "Identity and access management platform trusted by thousands of organizations.",
    website: "https://okta.com", industry: "Cybersecurity", headquarters: "San Francisco, CA",
    sourceType: "greenhouse", sourceId: "okta",
  },
  {
    name: "Snyk", slug: "snyk",
    description: "Developer security platform for finding and fixing vulnerabilities in code.",
    website: "https://snyk.io", industry: "Cybersecurity", headquarters: "Boston, MA",
    sourceType: "lever", sourceId: "snyk",
  },
  {
    name: "Wiz", slug: "wiz",
    description: "Cloud security platform that finds and fixes risks across cloud environments.",
    website: "https://wiz.io", industry: "Cybersecurity", headquarters: "New York, NY",
    sourceType: "greenhouse", sourceId: "wiz",
  },
  {
    name: "1Password", slug: "1password",
    description: "Password manager and secrets platform for individuals and enterprise teams.",
    website: "https://1password.com", industry: "Cybersecurity", headquarters: "Toronto, Canada",
    sourceType: "greenhouse", sourceId: "1password",
  },

  // ── Enterprise Software ───────────────────────────────────────────────────
  {
    name: "Palantir", slug: "palantir",
    description: "Data analytics platform for government and enterprise decision-making.",
    website: "https://palantir.com", industry: "Enterprise Software", headquarters: "Denver, CO",
    sourceType: "lever", sourceId: "palantir",
  },
  {
    name: "Asana", slug: "asana",
    description: "Work management platform helping teams organize, track, and manage their work.",
    website: "https://asana.com", industry: "Enterprise Software", headquarters: "San Francisco, CA",
    sourceType: "greenhouse", sourceId: "asana",
  },

  // ── Consumer & Social ─────────────────────────────────────────────────────
  {
    name: "Notion", slug: "notion",
    description: "All-in-one workspace for notes, docs, and project management.",
    website: "https://notion.so", industry: "Productivity", headquarters: "San Francisco, CA",
    sourceType: "greenhouse", sourceId: "notion",
  },
  {
    name: "Airtable", slug: "airtable",
    description: "Low-code platform combining spreadsheet flexibility with database structure.",
    website: "https://airtable.com", industry: "Productivity", headquarters: "San Francisco, CA",
    sourceType: "greenhouse", sourceId: "airtable",
  },
  {
    name: "Canva", slug: "canva",
    description: "Online visual design platform used by 170M+ people worldwide.",
    website: "https://canva.com", industry: "Design Tools", headquarters: "Sydney, Australia",
    sourceType: "greenhouse", sourceId: "canva",
  },
  {
    name: "Spotify", slug: "spotify",
    description: "Digital music streaming service with 600M+ users globally.",
    website: "https://spotify.com", industry: "Entertainment", headquarters: "Stockholm, Sweden",
    sourceType: "greenhouse", sourceId: "spotify",
  },
  {
    name: "Discord", slug: "discord",
    description: "Voice, video, and text communication platform for communities and teams.",
    website: "https://discord.com", industry: "Social", headquarters: "San Francisco, CA",
    sourceType: "greenhouse", sourceId: "discord",
  },
  {
    name: "Airbnb", slug: "airbnb",
    description: "Online marketplace for short-term homestays and travel experiences.",
    website: "https://airbnb.com", industry: "Travel", headquarters: "San Francisco, CA",
    sourceType: "greenhouse", sourceId: "airbnb",
  },
  {
    name: "Shopify", slug: "shopify",
    description: "Commerce platform powering millions of businesses worldwide.",
    website: "https://shopify.com", industry: "E-commerce", headquarters: "Ottawa, Canada",
    sourceType: "greenhouse", sourceId: "shopify",
  },
  {
    name: "Duolingo", slug: "duolingo",
    description: "World's most popular language learning app, used by 500M+ learners.",
    website: "https://duolingo.com", industry: "Consumer", headquarters: "Pittsburgh, PA",
    sourceType: "greenhouse", sourceId: "duolingo",
  },
  {
    name: "DoorDash", slug: "doordash",
    description: "Food delivery and local commerce platform operating in 27+ countries.",
    website: "https://doordash.com", industry: "Consumer", headquarters: "San Francisco, CA",
    sourceType: "greenhouse", sourceId: "doordash",
  },
  {
    name: "Lyft", slug: "lyft",
    description: "Rideshare platform connecting riders and drivers across North America.",
    website: "https://lyft.com", industry: "Transportation", headquarters: "San Francisco, CA",
    sourceType: "greenhouse", sourceId: "lyft",
  },
];

const collections = [
  {
    name: "Top AI Labs",
    slug: "top-ai-labs",
    description: "The frontier AI labs and applied AI companies shaping what comes next. From safety research to production models.",
    companies: ["anthropic", "openai", "scale-ai", "databricks", "mistral", "cohere", "perplexity", "xai", "runway", "elevenlabs", "weights-biases", "hugging-face"],
  },
  {
    name: "Best Dev Tools",
    slug: "best-dev-tools",
    description: "Products built for engineers, by engineers. The tools that power modern software teams and make developers more productive.",
    companies: ["vercel", "linear", "github", "supabase", "retool", "cursor", "figma", "warp", "datadog", "sentry", "postman", "grafana-labs"],
  },
  {
    name: "Fintech & Payments",
    slug: "fintech-payments",
    description: "Companies rebuilding financial infrastructure from the ground up — payments, banking, investing, and spend management.",
    companies: ["stripe", "brex", "plaid", "robinhood", "coinbase", "mercury", "ramp", "rippling", "affirm", "chime", "carta"],
  },
  {
    name: "Infrastructure & Cloud",
    slug: "infrastructure-cloud",
    description: "The picks-and-shovels companies powering the modern internet. If software eats the world, these companies feed the software.",
    companies: ["cloudflare", "hashicorp", "supabase", "vercel", "databricks", "confluent", "elastic", "snowflake", "fly-io"],
  },
  {
    name: "Cybersecurity",
    slug: "cybersecurity",
    description: "Companies protecting the modern internet — from endpoint security to identity, secrets management, and cloud security.",
    companies: ["crowdstrike", "okta", "snyk", "wiz", "1password", "cloudflare"],
  },
  {
    name: "Product & Design",
    slug: "product-design",
    description: "Companies famous for exceptional product thinking and world-class design. Places where craft and user experience obsession are in the DNA.",
    companies: ["figma", "canva", "notion", "airtable", "linear", "airbnb", "spotify", "discord", "shopify", "stripe"],
  },
  {
    name: "Enterprise & Data",
    slug: "enterprise-data",
    description: "The platforms that power Fortune 500 decisions — data warehouses, analytics, workflow automation, and enterprise intelligence.",
    companies: ["snowflake", "databricks", "confluent", "elastic", "mongodb", "datadog", "palantir", "asana"],
  },
];

async function main() {
  console.log("Seeding companies…");
  for (const company of companies) {
    await prisma.company.upsert({
      where: { slug: company.slug },
      create: {
        name: company.name,
        slug: company.slug,
        description: company.description,
        website: company.website,
        industry: company.industry,
        headquarters: company.headquarters,
        sourceType: company.sourceType ?? "manual",
        sourceId: company.sourceId ?? null,
      },
      update: {
        name: company.name,
        description: company.description,
        website: company.website,
        industry: company.industry,
        headquarters: company.headquarters,
        sourceType: company.sourceType ?? "manual",
        sourceId: company.sourceId ?? null,
      },
    });
    process.stdout.write(`  ✓ ${company.name}\n`);
  }

  console.log("\nSeeding collections…");
  for (const col of collections) {
    const collection = await prisma.collection.upsert({
      where: { slug: col.slug },
      create: { name: col.name, slug: col.slug, description: col.description },
      update: { name: col.name, description: col.description },
    });
    process.stdout.write(`  ✓ ${col.name}\n`);

    await prisma.collectionCompany.deleteMany({ where: { collectionId: collection.id } });

    for (let i = 0; i < col.companies.length; i++) {
      const company = await prisma.company.findUnique({ where: { slug: col.companies[i] } });
      if (!company) {
        console.warn(`    ! Company not found: ${col.companies[i]}`);
        continue;
      }
      await prisma.collectionCompany.create({
        data: { collectionId: collection.id, companyId: company.id, displayOrder: i },
      });
    }
  }

  console.log(`\nDone — ${companies.length} companies, ${collections.length} collections.`);
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
