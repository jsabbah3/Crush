import { config } from "dotenv";
config({ path: ".env.local" });
config();

import { PrismaClient } from "../src/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const adapter = new PrismaPg({ connectionString: process.env.DIRECT_URL ?? process.env.DATABASE_URL! });
const prisma = new PrismaClient({ adapter });

const COMPANIES = [
  { name: "Amazon",     slug: "amazon",     website: "https://amazon.com",     industry: "E-Commerce & Cloud",    headquarters: "Seattle, WA" },
  { name: "Salesforce", slug: "salesforce", website: "https://salesforce.com", industry: "Enterprise Software",   headquarters: "San Francisco, CA" },
  { name: "Microsoft",  slug: "microsoft",  website: "https://microsoft.com",  industry: "Software & Cloud",      headquarters: "Redmond, WA" },
  { name: "Apple",      slug: "apple",      website: "https://apple.com",      industry: "Consumer Technology",   headquarters: "Cupertino, CA" },
  { name: "Google",     slug: "google",     website: "https://google.com",     industry: "Search & Advertising",  headquarters: "Mountain View, CA" },
  { name: "Meta",       slug: "meta",       website: "https://meta.com",       industry: "Social Media",          headquarters: "Menlo Park, CA" },
  { name: "Netflix",    slug: "netflix",    website: "https://netflix.com",    industry: "Streaming",             headquarters: "Los Gatos, CA" },
  { name: "Adobe",      slug: "adobe",      website: "https://adobe.com",      industry: "Creative Software",     headquarters: "San Jose, CA" },
  { name: "IBM",        slug: "ibm",        website: "https://ibm.com",        industry: "Enterprise Technology", headquarters: "Armonk, NY" },
  { name: "Oracle",     slug: "oracle",     website: "https://oracle.com",     industry: "Enterprise Software",   headquarters: "Austin, TX" },
  { name: "Uber",       slug: "uber",       website: "https://uber.com",       industry: "Ride-Sharing",          headquarters: "San Francisco, CA" },
  { name: "Lyft",       slug: "lyft",       website: "https://lyft.com",       industry: "Ride-Sharing",          headquarters: "San Francisco, CA" },
  { name: "Airbnb",     slug: "airbnb",     website: "https://airbnb.com",     industry: "Travel & Hospitality",  headquarters: "San Francisco, CA" },
  { name: "DoorDash",   slug: "doordash",   website: "https://doordash.com",   industry: "Food Delivery",         headquarters: "San Francisco, CA" },
  { name: "Instacart",  slug: "instacart",  website: "https://instacart.com",  industry: "Grocery Delivery",      headquarters: "San Francisco, CA" },
  { name: "Spotify",    slug: "spotify",    website: "https://spotify.com",    industry: "Music Streaming",       headquarters: "Stockholm, Sweden" },
  { name: "Twitter/X",  slug: "twitter-x",  website: "https://x.com",          industry: "Social Media",          headquarters: "San Francisco, CA" },
  { name: "Snap",       slug: "snap",       website: "https://snap.com",       industry: "Social Media",          headquarters: "Santa Monica, CA" },
  { name: "Pinterest",  slug: "pinterest",  website: "https://pinterest.com",  industry: "Social Media",          headquarters: "San Francisco, CA" },
  { name: "LinkedIn",   slug: "linkedin",   website: "https://linkedin.com",   industry: "Professional Network",  headquarters: "Sunnyvale, CA" },
];

async function main() {
  console.log(`Upserting ${COMPANIES.length} manual companies…`);
  let added = 0;
  let skipped = 0;

  for (const c of COMPANIES) {
    const result = await prisma.company.upsert({
      where: { slug: c.slug },
      create: { ...c, sourceType: "manual" },
      update: {},
    });
    if (result.createdAt.getTime() === result.updatedAt.getTime()) {
      console.log(`  + ${c.name}`);
      added++;
    } else {
      console.log(`  ~ ${c.name} (already exists)`);
      skipped++;
    }
  }

  console.log(`\nDone: ${added} added, ${skipped} already existed.`);
  await prisma.$disconnect();
}

main().catch(async (e) => {
  console.error(e);
  await prisma.$disconnect();
  process.exit(1);
});
