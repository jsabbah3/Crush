/**
 * generate-insight.ts
 *
 * Generates a draft "Getting hired at [Company]" insider guide using Claude
 * with web search, grounded in what's already in the DB (signals, funding,
 * active jobs). Drafts land in insights/drafts/<slug>.md for human review;
 * publish with --publish (or later via add-insight.ts).
 *
 * Usage:
 *   npx dotenv-cli -e .env.local -- npx tsx scripts/generate-insight.ts --company stripe
 *   npx dotenv-cli -e .env.local -- npx tsx scripts/generate-insight.ts --batch 5
 *   npx dotenv-cli -e .env.local -- npx tsx scripts/generate-insight.ts --company stripe --publish
 *
 * Flags:
 *   --company <slug>   Generate for one company
 *   --batch <n>        Generate for the n most-tracked companies that have no insight yet
 *   --publish          Also upsert the result into company_insights (default: draft only)
 *   --author <name>    Author byline when publishing
 *
 * Requires ANTHROPIC_API_KEY in the environment.
 */

import * as fs from "fs";
import * as path from "path";
import Anthropic from "@anthropic-ai/sdk";
import { PrismaClient } from "@/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const adapter = new PrismaPg({ connectionString: process.env.DIRECT_URL ?? process.env.DATABASE_URL! });
const prisma = new PrismaClient({ adapter } as any);
const anthropic = new Anthropic();

const DRAFTS_DIR = path.resolve("insights", "drafts");

function arg(flag: string): string | undefined {
  const i = process.argv.indexOf(flag);
  return i !== -1 ? process.argv[i + 1] : undefined;
}

const VOICE = `
You write for Crush, a job alert watchlist for senior tech professionals. Voice: warm, practical, insider, direct. You sound like a smart colleague who's been through the hiring process at these companies and knows what's actually useful — not a job board, not a recruiter, not a startup pitch.

Rules:
- Short declarative sentences. Concrete specifics: real team names, real interview stages, real numbers where you have them.
- Never use: "revolutionizing", "disrupting", "unlock your potential", "land your dream job", "exciting opportunity", "rockstar", "leverage" (as a verb), "real-time".
- No exclamation points. No hype. Assume the reader is discerning and senior (4-10 years experience).
- It's fine to say who the company is NOT a fit for. That honesty is the brand.
- Emulate: Linear's website copy, Notion's early marketing. Never sound like a LinkedIn recruiter email.
`.trim();

const STRUCTURE = `
Structure the guide with these sections (## headings, no top-level title):
- An opening 2-3 paragraphs: what the company is, why it's respected, what's distinctive about how they hire. No heading.
- ## Who they're hiring — headcount, growth posture, which functions are active
- ## The process — the actual interview loop, stage by stage, with typical timeline
- (optional) one ## section on the most distinctive part of their process, if they have one (e.g. a work sample, a trial week)
- ## What they value — 3-5 bolded traits with honest explanations, including who is NOT a fit
- ## The technical bar — what depth they expect, by function
- ## Things worth knowing — referrals, equity, growth trajectory, anything an insider would tell a friend
- ## Should you apply? — a direct closing paragraph
`.trim();

async function buildContext(companySlug: string) {
  const company = await prisma.company.findUnique({
    where: { slug: companySlug },
    include: {
      signals: { orderBy: { publishedAt: "desc" }, take: 10 },
      jobs: { where: { status: "ACTIVE" }, orderBy: { postedAt: "desc" }, take: 40, select: { title: true, location: true, remote: true } },
      _count: { select: { trackedBy: true } },
    },
  });
  if (!company) return null;

  const funding = await prisma.fundingSignal.findMany({
    where: { OR: [{ companyId: company.id }, { companyName: { equals: company.name, mode: "insensitive" } }] },
    orderBy: { detectedAt: "desc" },
    take: 3,
  });

  const lines: string[] = [
    `Company: ${company.name}`,
    company.website ? `Website: ${company.website}` : "",
    company.description ? `Description: ${company.description}` : "",
    company.industry ? `Industry: ${company.industry}` : "",
    company.headquarters ? `HQ: ${company.headquarters}` : "",
    company.size ? `Size: ${company.size}` : "",
    company.fundingStage ? `Funding stage: ${company.fundingStage}` : "",
  ];

  if (funding.length) {
    lines.push("\nRecent funding signals:");
    for (const f of funding) {
      lines.push(`- ${f.round ?? "round"} ${f.amount ?? ""} ${f.investors ? `from ${f.investors}` : ""} (${f.detectedAt.toISOString().slice(0, 10)})`.replace(/\s+/g, " "));
    }
  }

  if (company.signals.length) {
    lines.push("\nRecent engineering blog / news signals:");
    for (const s of company.signals) {
      lines.push(`- [${s.type}] ${s.title}${s.summary ? ` — ${s.summary}` : ""}`);
    }
  }

  if (company.jobs.length) {
    lines.push(`\nCurrently active roles on their ATS (${company.jobs.length} shown):`);
    for (const j of company.jobs) {
      lines.push(`- ${j.title}${j.location ? ` (${j.location})` : ""}${j.remote ? " [remote]" : ""}`);
    }
  }

  return { company, context: lines.filter(Boolean).join("\n") };
}

/** Text blocks after the last tool-result block = the final guide (earlier text is research narration). */
function extractGuide(content: Anthropic.ContentBlock[]): string {
  let lastToolIdx = -1;
  content.forEach((b, i) => {
    if (b.type !== "text" && b.type !== "thinking") lastToolIdx = i;
  });
  const tail = content
    .slice(lastToolIdx + 1)
    .filter((b): b is Anthropic.TextBlock => b.type === "text")
    .map((b) => b.text)
    .join("\n");
  if (tail.trim()) return tail.trim();
  return content.filter((b): b is Anthropic.TextBlock => b.type === "text").map((b) => b.text).join("\n").trim();
}

async function generate(companySlug: string): Promise<string | null> {
  const built = await buildContext(companySlug);
  if (!built) {
    console.error(`Company not found: ${companySlug}`);
    return null;
  }
  const { company, context } = built;
  console.log(`\n▶ ${company.name} (${company._count.trackedBy} trackers, ${company.jobs.length} active roles)`);

  const prompt = `${VOICE}

Write an insider hiring guide: "Getting hired at ${company.name}".

Use web search to research their interview process, culture, and what current/former employees say (interview review sites, engineering blog, careers page, recent news). Cross-check claims — if something is uncertain or varies by team, say so honestly rather than asserting it. Do not fabricate specific stage names, timelines, or numbers you can't support.

Here is verified internal data from our database — treat it as ground truth and weave the relevant parts in (especially what roles are actually open right now, and recent funding):

${context}

${STRUCTURE}

Length: 700-1100 words. The reader should finish knowing whether to pursue this company and exactly what to expect if they do.

After you finish researching, your final response must be ONLY the markdown body of the guide — no preamble, no "here is the guide", no citations footer, no commentary.`;

  let messages: Anthropic.MessageParam[] = [{ role: "user", content: prompt }];
  let response: Anthropic.Message;
  let continuations = 0;

  while (true) {
    const stream = anthropic.messages.stream({
      model: "claude-opus-4-8",
      max_tokens: 32000,
      thinking: { type: "adaptive" },
      tools: [{ type: "web_search_20260209", name: "web_search", max_uses: 8 }],
      messages,
    });
    stream.on("text", () => process.stdout.write("."));
    response = await stream.finalMessage();

    // Server-side tool loop can pause; resume by re-sending with the assistant turn appended.
    if (response.stop_reason === "pause_turn" && continuations < 4) {
      continuations++;
      messages = [...messages, { role: "assistant", content: response.content }];
      continue;
    }
    break;
  }
  process.stdout.write("\n");

  if (response.stop_reason === "refusal") {
    console.error(`  ✗ Request refused for ${company.name}`);
    return null;
  }

  const guide = extractGuide(response.content);
  if (!guide) {
    console.error(`  ✗ No guide text returned for ${company.name} (stop_reason: ${response.stop_reason})`);
    return null;
  }

  fs.mkdirSync(DRAFTS_DIR, { recursive: true });
  const outPath = path.join(DRAFTS_DIR, `${companySlug}.md`);
  fs.writeFileSync(outPath, guide + "\n");
  const searches = response.usage.server_tool_use?.web_search_requests ?? 0;
  console.log(`  ✓ Draft written: insights/drafts/${companySlug}.md (${guide.split(/\s+/).length} words, ${searches} searches)`);

  if (process.argv.includes("--publish")) {
    await prisma.companyInsight.upsert({
      where: { slug: `getting-hired-at-${companySlug}` },
      update: { title: `Getting hired at ${company.name}`, body: guide, author: arg("--author") ?? null },
      create: {
        companyId: company.id,
        slug: `getting-hired-at-${companySlug}`,
        title: `Getting hired at ${company.name}`,
        body: guide,
        author: arg("--author") ?? null,
      },
    });
    console.log(`  ✓ Published: /companies/${companySlug}`);
  }

  return guide;
}

async function main() {
  const companySlug = arg("--company");
  const batch = arg("--batch");

  if (!companySlug && !batch) {
    console.error("Usage: generate-insight.ts --company <slug> | --batch <n> [--publish] [--author <name>]");
    process.exit(1);
  }

  let slugs: string[] = [];
  if (companySlug) {
    slugs = [companySlug];
  } else {
    const companies = await prisma.company.findMany({
      where: { insights: { none: {} } },
      orderBy: { trackedBy: { _count: "desc" } },
      take: parseInt(batch!, 10),
      select: { slug: true },
    });
    slugs = companies.map((c) => c.slug);
    console.log(`Batch: ${slugs.length} most-tracked companies without an insight:\n  ${slugs.join(", ")}`);
  }

  for (const slug of slugs) {
    try {
      await generate(slug);
    } catch (err) {
      console.error(`  ✗ Failed for ${slug}:`, err instanceof Error ? err.message : err);
    }
  }
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
