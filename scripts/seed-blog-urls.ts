/**
 * seed-blog-urls.ts
 *
 * Seeds known engineering blog RSS URLs for top companies.
 * Run: npx dotenv-cli -e .env.local -- npx tsx scripts/seed-blog-urls.ts
 */
import { PrismaClient } from "@/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const adapter = new PrismaPg({ connectionString: process.env.DIRECT_URL ?? process.env.DATABASE_URL! });
const prisma = new PrismaClient({ adapter } as any);

// slug → RSS feed URL (verified working)
const BLOG_URLS: Record<string, string> = {
  "stripe":        "https://stripe.com/blog/feed.rss",
  "vercel":        "https://vercel.com/atom",
  "github":        "https://github.blog/feed/",
  "cloudflare":    "https://blog.cloudflare.com/rss/",
  "shopify":       "https://shopify.engineering/feed",
  "netflix":       "https://netflixtechblog.medium.com/feed",
  "airbnb":        "https://medium.com/feed/airbnb-engineering",
  "uber":          "https://eng.uber.com/feed/",
  "lyft":          "https://eng.lyft.com/feed",
  "dropbox":       "https://dropbox.tech/feed",
  "pinterest":     "https://medium.com/feed/pinterest-engineering",
  "figma":         "https://www.figma.com/blog/rss/",
  "linear":        "https://linear.app/blog/feed",
  "retool":        "https://retool.com/blog/rss",
  "anthropic":     "https://www.anthropic.com/news/rss.xml",
  "openai":        "https://openai.com/news/rss.xml",
  "mistral-ai":    "https://mistral.ai/en/news/rss.xml",
  "cohere":        "https://cohere.com/blog/rss.xml",
  "hugging-face":  "https://huggingface.co/blog/feed.xml",
  "databricks":    "https://www.databricks.com/feed",
  "snowflake":     "https://www.snowflake.com/en-us/blog/feed/",
  "confluent":     "https://www.confluent.io/rss.xml",
  "datadog":       "https://www.datadoghq.com/blog/feed/",
  "hashicorp":     "https://www.hashicorp.com/blog/feed.xml",
  "twilio":        "https://www.twilio.com/en-us/blog/rss.xml",
  "plaid":         "https://plaid.com/blog/rss.xml",
  "rippling":      "https://www.rippling.com/blog/feed",
  "brex":          "https://medium.com/feed/brex-engineering",
  "ramp":          "https://engineering.ramp.com/rss.xml",
  "scale-ai":      "https://scale.com/blog/feed.xml",
};

async function main() {
  let updated = 0;
  let notFound = 0;

  for (const [slug, blogRssUrl] of Object.entries(BLOG_URLS)) {
    const company = await prisma.company.findUnique({ where: { slug } });
    if (!company) {
      console.log(`  ⚠ Not found: ${slug}`);
      notFound++;
      continue;
    }
    await prisma.company.update({
      where: { slug },
      data: { blogRssUrl },
    });
    console.log(`  ✓ ${company.name}`);
    updated++;
  }

  console.log(`\nDone: ${updated} updated, ${notFound} not found in DB.`);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
