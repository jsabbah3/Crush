import { config } from "dotenv";
config({ path: ".env.local" });
config();

import { PrismaClient } from "../src/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const adapter = new PrismaPg({ connectionString: process.env.DIRECT_URL ?? process.env.DATABASE_URL! });
const prisma = new PrismaClient({ adapter });

const companies = [
  {
    name: "Anthropic",
    slug: "anthropic",
    description: "AI safety company building reliable, interpretable, and steerable AI systems.",
    website: "https://anthropic.com",
    industry: "AI",
    headquarters: "San Francisco, CA",
  },
  {
    name: "OpenAI",
    slug: "openai",
    description: "AI research and deployment company behind ChatGPT and GPT-4.",
    website: "https://openai.com",
    industry: "AI",
    headquarters: "San Francisco, CA",
  },
  {
    name: "Stripe",
    slug: "stripe",
    description: "Financial infrastructure platform for the internet.",
    website: "https://stripe.com",
    industry: "Fintech",
    headquarters: "San Francisco, CA",
  },
  {
    name: "Airbnb",
    slug: "airbnb",
    description: "Online marketplace for short-term homestays and experiences.",
    website: "https://airbnb.com",
    industry: "Travel",
    headquarters: "San Francisco, CA",
  },
  {
    name: "Vercel",
    slug: "vercel",
    description: "Platform for frontend developers to build and deploy fast web apps.",
    website: "https://vercel.com",
    industry: "Developer Tools",
    headquarters: "San Francisco, CA",
  },
  {
    name: "Linear",
    slug: "linear",
    description: "Project management tool built for modern software teams.",
    website: "https://linear.app",
    industry: "Developer Tools",
    headquarters: "San Francisco, CA",
  },
  {
    name: "Notion",
    slug: "notion",
    description: "All-in-one workspace for notes, docs, and project management.",
    website: "https://notion.so",
    industry: "Productivity",
    headquarters: "San Francisco, CA",
  },
  {
    name: "Figma",
    slug: "figma",
    description: "Collaborative design platform for UI/UX designers.",
    website: "https://figma.com",
    industry: "Design Tools",
    headquarters: "San Francisco, CA",
  },
  {
    name: "Spotify",
    slug: "spotify",
    description: "Digital music streaming service with 600M+ users.",
    website: "https://spotify.com",
    industry: "Entertainment",
    headquarters: "Stockholm, Sweden",
  },
  {
    name: "Shopify",
    slug: "shopify",
    description: "Commerce platform powering millions of businesses worldwide.",
    website: "https://shopify.com",
    industry: "E-commerce",
    headquarters: "Ottawa, Canada",
  },
  {
    name: "GitHub",
    slug: "github",
    description: "Developer platform for hosting and collaborating on code.",
    website: "https://github.com",
    industry: "Developer Tools",
    headquarters: "San Francisco, CA",
  },
  {
    name: "Cloudflare",
    slug: "cloudflare",
    description: "Global network platform for security, performance, and reliability.",
    website: "https://cloudflare.com",
    industry: "Infrastructure",
    headquarters: "San Francisco, CA",
  },
  {
    name: "Discord",
    slug: "discord",
    description: "Voice, video, and text communication platform for communities.",
    website: "https://discord.com",
    industry: "Social",
    headquarters: "San Francisco, CA",
  },
  {
    name: "Canva",
    slug: "canva",
    description: "Online visual design platform used by 170M+ people.",
    website: "https://canva.com",
    industry: "Design Tools",
    headquarters: "Sydney, Australia",
  },
  {
    name: "Brex",
    slug: "brex",
    description: "Financial services and software for startups and enterprises.",
    website: "https://brex.com",
    industry: "Fintech",
    headquarters: "San Francisco, CA",
  },
  {
    name: "Supabase",
    slug: "supabase",
    description: "Open source Firebase alternative with a Postgres database.",
    website: "https://supabase.com",
    industry: "Developer Tools",
    headquarters: "San Francisco, CA",
  },
  {
    name: "Retool",
    slug: "retool",
    description: "Low-code platform for building internal tools.",
    website: "https://retool.com",
    industry: "Developer Tools",
    headquarters: "San Francisco, CA",
  },
  {
    name: "Plaid",
    slug: "plaid",
    description: "Financial data network powering fintech apps.",
    website: "https://plaid.com",
    industry: "Fintech",
    headquarters: "San Francisco, CA",
  },
  {
    name: "Airtable",
    slug: "airtable",
    description: "Low-code platform combining spreadsheet and database capabilities.",
    website: "https://airtable.com",
    industry: "Productivity",
    headquarters: "San Francisco, CA",
  },
  {
    name: "Databricks",
    slug: "databricks",
    description: "Data and AI platform for lakehouse architecture.",
    website: "https://databricks.com",
    industry: "Data & AI",
    headquarters: "San Francisco, CA",
  },
  {
    name: "HashiCorp",
    slug: "hashicorp",
    description: "Infrastructure automation tools including Terraform and Vault.",
    website: "https://hashicorp.com",
    industry: "Infrastructure",
    headquarters: "San Francisco, CA",
  },
  {
    name: "Rippling",
    slug: "rippling",
    description: "HR, IT, and finance platform for managing employees and contractors.",
    website: "https://rippling.com",
    industry: "HR Tech",
    headquarters: "San Francisco, CA",
  },
  {
    name: "Scale AI",
    slug: "scale-ai",
    description: "Data platform accelerating AI development for enterprise and government.",
    website: "https://scale.com",
    industry: "AI",
    headquarters: "San Francisco, CA",
  },
  {
    name: "Hugging Face",
    slug: "hugging-face",
    description: "The AI community building the future of machine learning.",
    website: "https://huggingface.co",
    industry: "AI",
    headquarters: "New York, NY",
  },
  {
    name: "Cursor",
    slug: "cursor",
    description: "AI-powered code editor built on VS Code.",
    website: "https://cursor.com",
    industry: "Developer Tools",
    headquarters: "San Francisco, CA",
  },
];

async function main() {
  console.log("Seeding companies…");
  let created = 0;

  for (const company of companies) {
    await prisma.company.upsert({
      where: { slug: company.slug },
      create: company,
      update: company,
    });
    created++;
    process.stdout.write(`  ✓ ${company.name}\n`);
  }

  console.log(`\nSeeded ${created} companies.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
