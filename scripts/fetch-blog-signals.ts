/**
 * fetch-blog-signals.ts
 *
 * Fetches the latest engineering blog posts for all companies with a blogRssUrl
 * and stores them as CompanySignal records (deduped by URL).
 *
 * Run:  npx dotenv-cli -e .env.local -- npx tsx scripts/fetch-blog-signals.ts
 * Cron: run daily (e.g. add to your existing ingestion cron)
 */
import Parser from "rss-parser";
import { PrismaClient } from "@/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const adapter = new PrismaPg({ connectionString: process.env.DIRECT_URL ?? process.env.DATABASE_URL! });
const prisma = new PrismaClient({ adapter } as any);
const parser = new Parser({ timeout: 10_000 });

const MAX_PER_COMPANY = 5; // store the 5 most recent posts per company

function truncate(text: string | undefined, max: number): string | undefined {
  if (!text) return undefined;
  const stripped = text.replace(/<[^>]+>/g, "").trim();
  return stripped.length > max ? stripped.slice(0, max).trimEnd() + "…" : stripped;
}

async function fetchCompany(companyId: string, name: string, rssUrl: string) {
  try {
    const feed = await parser.parseURL(rssUrl);
    const items = (feed.items ?? []).slice(0, MAX_PER_COMPANY);

    let added = 0;
    for (const item of items) {
      const url = item.link ?? item.guid;
      if (!url) continue;

      await prisma.companySignal.upsert({
        where: { companyId_url: { companyId, url } },
        update: {}, // already exists — don't overwrite
        create: {
          companyId,
          type: "blog_post",
          title: item.title ?? "Untitled",
          url,
          summary: truncate(item.contentSnippet ?? item.content, 280),
          publishedAt: item.pubDate ? new Date(item.pubDate) : null,
        },
      });
      added++;
    }

    console.log(`  ✓ ${name}: ${added} posts synced`);
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.warn(`  ⚠ ${name}: ${msg.slice(0, 120)}`);
  }
}

async function main() {
  const companies = await prisma.company.findMany({
    where: { blogRssUrl: { not: null } },
    select: { id: true, name: true, blogRssUrl: true },
  });

  console.log(`Fetching blog signals for ${companies.length} companies…\n`);

  for (const c of companies) {
    await fetchCompany(c.id, c.name, c.blogRssUrl!);
  }

  console.log("\nDone.");
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
