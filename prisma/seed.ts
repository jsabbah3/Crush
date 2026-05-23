import { config } from "dotenv";
config({ path: ".env.local" });
config();

import { PrismaClient } from "../src/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const adapter = new PrismaPg({ connectionString: process.env.DIRECT_URL ?? process.env.DATABASE_URL! });
const prisma = new PrismaClient({ adapter });

const companies = [
  // AI
  { name: "Anthropic", slug: "anthropic", description: "AI safety company building reliable, interpretable, and steerable AI systems.", website: "https://anthropic.com", industry: "AI", headquarters: "San Francisco, CA" },
  { name: "OpenAI", slug: "openai", description: "AI research and deployment company behind ChatGPT and GPT-4.", website: "https://openai.com", industry: "AI", headquarters: "San Francisco, CA" },
  { name: "Scale AI", slug: "scale-ai", description: "Data platform accelerating AI development for enterprise and government.", website: "https://scale.com", industry: "AI", headquarters: "San Francisco, CA" },
  { name: "Hugging Face", slug: "hugging-face", description: "The AI community building the future of machine learning.", website: "https://huggingface.co", industry: "AI", headquarters: "New York, NY" },
  { name: "Cursor", slug: "cursor", description: "AI-powered code editor built on VS Code.", website: "https://cursor.com", industry: "Developer Tools", headquarters: "San Francisco, CA" },
  { name: "Databricks", slug: "databricks", description: "Data and AI platform for lakehouse architecture.", website: "https://databricks.com", industry: "Data & AI", headquarters: "San Francisco, CA" },
  { name: "Mistral", slug: "mistral", description: "European frontier AI company building the best open models.", website: "https://mistral.ai", industry: "AI", headquarters: "Paris, France" },
  { name: "Cohere", slug: "cohere", description: "Enterprise AI platform for language understanding and generation.", website: "https://cohere.com", industry: "AI", headquarters: "Toronto, Canada" },
  { name: "Perplexity", slug: "perplexity", description: "AI-powered answer engine that searches and reasons over the web.", website: "https://perplexity.ai", industry: "AI", headquarters: "San Francisco, CA" },
  { name: "xAI", slug: "xai", description: "Elon Musk's AI company building Grok, with a mission to understand the universe.", website: "https://x.ai", industry: "AI", headquarters: "San Francisco, CA" },
  // Developer Tools
  { name: "Vercel", slug: "vercel", description: "Platform for frontend developers to build and deploy fast web apps.", website: "https://vercel.com", industry: "Developer Tools", headquarters: "San Francisco, CA" },
  { name: "Linear", slug: "linear", description: "Project management tool built for modern software teams.", website: "https://linear.app", industry: "Developer Tools", headquarters: "San Francisco, CA" },
  { name: "GitHub", slug: "github", description: "Developer platform for hosting and collaborating on code.", website: "https://github.com", industry: "Developer Tools", headquarters: "San Francisco, CA" },
  { name: "Supabase", slug: "supabase", description: "Open source Firebase alternative with a Postgres database.", website: "https://supabase.com", industry: "Developer Tools", headquarters: "San Francisco, CA" },
  { name: "Retool", slug: "retool", description: "Low-code platform for building internal tools.", website: "https://retool.com", industry: "Developer Tools", headquarters: "San Francisco, CA" },
  { name: "Figma", slug: "figma", description: "Collaborative design platform for UI/UX designers.", website: "https://figma.com", industry: "Design Tools", headquarters: "San Francisco, CA" },
  { name: "Warp", slug: "warp", description: "AI-powered terminal built for developer productivity.", website: "https://warp.dev", industry: "Developer Tools", headquarters: "New York, NY" },
  // Infrastructure
  { name: "Cloudflare", slug: "cloudflare", description: "Global network platform for security, performance, and reliability.", website: "https://cloudflare.com", industry: "Infrastructure", headquarters: "San Francisco, CA" },
  { name: "HashiCorp", slug: "hashicorp", description: "Infrastructure automation tools including Terraform and Vault.", website: "https://hashicorp.com", industry: "Infrastructure", headquarters: "San Francisco, CA" },
  { name: "Fly.io", slug: "fly-io", description: "Platform for running full-stack apps and databases close to users globally.", website: "https://fly.io", industry: "Infrastructure", headquarters: "Chicago, IL" },
  // Fintech
  { name: "Stripe", slug: "stripe", description: "Financial infrastructure platform for the internet.", website: "https://stripe.com", industry: "Fintech", headquarters: "San Francisco, CA" },
  { name: "Brex", slug: "brex", description: "Financial services and software for startups and enterprises.", website: "https://brex.com", industry: "Fintech", headquarters: "San Francisco, CA" },
  { name: "Plaid", slug: "plaid", description: "Financial data network powering fintech apps.", website: "https://plaid.com", industry: "Fintech", headquarters: "San Francisco, CA" },
  { name: "Robinhood", slug: "robinhood", description: "Commission-free investing app democratizing access to financial markets.", website: "https://robinhood.com", industry: "Fintech", headquarters: "Menlo Park, CA" },
  { name: "Coinbase", slug: "coinbase", description: "The leading cryptocurrency exchange and Web3 platform.", website: "https://coinbase.com", industry: "Fintech", headquarters: "San Francisco, CA" },
  { name: "Mercury", slug: "mercury", description: "Banking built for startups, with powerful financial tools.", website: "https://mercury.com", industry: "Fintech", headquarters: "San Francisco, CA" },
  { name: "Ramp", slug: "ramp", description: "Corporate card and spend management platform saving companies money.", website: "https://ramp.com", industry: "Fintech", headquarters: "New York, NY" },
  { name: "Rippling", slug: "rippling", description: "HR, IT, and finance platform for managing employees and contractors.", website: "https://rippling.com", industry: "HR Tech", headquarters: "San Francisco, CA" },
  // Product & Consumer
  { name: "Notion", slug: "notion", description: "All-in-one workspace for notes, docs, and project management.", website: "https://notion.so", industry: "Productivity", headquarters: "San Francisco, CA" },
  { name: "Airtable", slug: "airtable", description: "Low-code platform combining spreadsheet and database capabilities.", website: "https://airtable.com", industry: "Productivity", headquarters: "San Francisco, CA" },
  { name: "Canva", slug: "canva", description: "Online visual design platform used by 170M+ people.", website: "https://canva.com", industry: "Design Tools", headquarters: "Sydney, Australia" },
  { name: "Spotify", slug: "spotify", description: "Digital music streaming service with 600M+ users.", website: "https://spotify.com", industry: "Entertainment", headquarters: "Stockholm, Sweden" },
  { name: "Discord", slug: "discord", description: "Voice, video, and text communication platform for communities.", website: "https://discord.com", industry: "Social", headquarters: "San Francisco, CA" },
  { name: "Airbnb", slug: "airbnb", description: "Online marketplace for short-term homestays and experiences.", website: "https://airbnb.com", industry: "Travel", headquarters: "San Francisco, CA" },
  { name: "Shopify", slug: "shopify", description: "Commerce platform powering millions of businesses worldwide.", website: "https://shopify.com", industry: "E-commerce", headquarters: "Ottawa, Canada" },
];

const collections = [
  {
    name: "Top AI Labs",
    slug: "top-ai-labs",
    description: "The frontier AI labs and applied AI companies shaping what comes next. From safety research to production models.",
    companies: ["anthropic", "openai", "scale-ai", "hugging-face", "databricks", "mistral", "cohere", "perplexity", "xai", "cursor"],
  },
  {
    name: "Best Dev Tools",
    slug: "best-dev-tools",
    description: "Products built for engineers, by engineers. The tools that power modern software teams and make developers more productive.",
    companies: ["vercel", "linear", "github", "supabase", "retool", "cursor", "figma", "warp", "cloudflare", "hashicorp"],
  },
  {
    name: "Fintech & Payments",
    slug: "fintech-payments",
    description: "Companies rebuilding financial infrastructure from the ground up — payments, banking, investing, and spend management.",
    companies: ["stripe", "brex", "plaid", "robinhood", "coinbase", "mercury", "ramp", "rippling"],
  },
  {
    name: "Infrastructure & Cloud",
    slug: "infrastructure-cloud",
    description: "The picks-and-shovels companies powering the modern internet. If software eats the world, these companies feed the software.",
    companies: ["cloudflare", "hashicorp", "supabase", "vercel", "github", "databricks", "fly-io", "retool"],
  },
  {
    name: "Product & Design",
    slug: "product-design",
    description: "Companies famous for exceptional product thinking and world-class design. Places where craft and user experience obsession are in the DNA.",
    companies: ["figma", "canva", "notion", "airtable", "linear", "airbnb", "spotify", "discord", "shopify", "stripe"],
  },
];

async function main() {
  console.log("Seeding companies…");
  for (const company of companies) {
    await prisma.company.upsert({
      where: { slug: company.slug },
      create: company,
      update: company,
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

    // Delete existing memberships then re-create in order
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
