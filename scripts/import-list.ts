/**
 * Turn an outside company list into a Crush collection.
 *
 * Reads scripts/lists/<slug>.txt (one company per line: name|domain|what they
 * do, in the list's own order), then for each company:
 *   - finds our record by website, or by name when the domains agree
 *     (factory.ai / factory.com) — never a namesake on another domain;
 *   - creates it if we don't have it;
 *   - if it has no board (or a board with nothing open), looks for one —
 *     the company's careers page first — and pulls its roles;
 * and finally sets the collection to exactly the list, in order.
 *
 *   npx tsx --env-file=.env.local scripts/import-list.ts breakout-list
 *   ... --companies-only   # import companies and boards, leave the collection alone
 *   ... --collection-only  # skip board lookups, just (re)write the collection
 *
 * Safe to re-run. Add new lists to LISTS; keep partner lists in
 * UNLISTED_COLLECTIONS (src/lib/collections.ts) until they launch.
 */
import { readFileSync } from "fs";
import { prisma } from "../src/lib/prisma";
import { findCompanyBoard } from "../src/lib/board-check";
import { ingestCompanyById } from "../src/lib/ingestion";
import { UNLISTED_COLLECTIONS } from "../src/lib/collections";

type ListMeta = {
  name: string;
  description: string;
  /** "roles": hiring companies first, most open roles at the top (for big
   *  lists like VC portfolios). Default: the list's own order. */
  order?: "list" | "roles";
  /** Added to each company's tags (VC portfolios). */
  tag?: string;
};

const FOLLOW = "Follow the whole list and Crush emails you when one of them opens a role that fits you.";

const LISTS: Record<string, ListMeta> = {
  "founders-you-should-know": {
    name: "Founders You Should Know",
    description:
      "Every company that has presented at Founders You Should Know, the invite-only San Francisco showcase for breakout startups. Follow the whole list and Crush emails you when one of them opens a role that fits you.",
  },
  "breakout-list": {
    name: "Breakout List",
    description:
      "The startups on Breakout List — great companies to join, picked by investors. Follow the whole list and Crush emails you when one of them opens a role that fits you.",
  },
  "cerebral-valley": {
    name: "Cerebral Valley",
    description: `The AI labs and companies that build with Cerebral Valley — partners and sponsors of its hackathons and model launches. ${FOLLOW}`,
    order: "roles",
  },
  "forbes-ai-50": {
    name: "Forbes AI 50 (2026)",
    description: `The 50 most promising private AI companies of 2026, as picked by Forbes. ${FOLLOW}`,
    order: "roles",
  },
  sequoia: {
    name: "Sequoia portfolio",
    description: `Companies backed by Sequoia Capital, from its current portfolio — hiring ones first. ${FOLLOW}`,
    order: "roles",
    tag: "Sequoia",
  },
  a16z: {
    name: "a16z portfolio",
    description: `Active companies in Andreessen Horowitz's portfolio — hiring ones first. ${FOLLOW}`,
    order: "roles",
    tag: "a16z",
  },
  "kleiner-perkins": {
    name: "Kleiner Perkins portfolio",
    description: `Kleiner Perkins' current portfolio companies — hiring ones first. ${FOLLOW}`,
    order: "roles",
    tag: "Kleiner Perkins",
  },
  "founders-fund": {
    name: "Founders Fund portfolio",
    description: `Companies backed by Founders Fund — hiring ones first. ${FOLLOW}`,
    order: "roles",
    tag: "Founders Fund",
  },
};

const host = (u: string | null) => {
  if (!u) return null;
  try {
    return new URL(u.startsWith("http") ? u : `https://${u}`).hostname.replace(/^www\./, "").toLowerCase();
  } catch {
    return null;
  }
};
/** "listenlabs.ai" → "listen", "tryprofound.com" → "profound" */
const core = (h: string | null) =>
  (h ?? "").split(".")[0].replace(/^(?:try|use|get|join|with|go|meet|hey)(?=[a-z]{4})/, "").replace(/(?:labs|hq|ai|app|inc)$/, "");

const slugify = (n: string) => n.toLowerCase().replace(/&/g, "and").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 60);
async function uniqueSlug(name: string) {
  const base = slugify(name) || "company";
  for (let n = 1; n < 50; n++) {
    const slug = n === 1 ? base : `${base}-${n}`;
    if (!(await prisma.company.findUnique({ where: { slug }, select: { id: true } }))) return slug;
  }
  return `${base}-${Date.now()}`;
}

const select = {
  id: true, name: true, website: true, description: true, sourceType: true, sourceId: true, tags: true,
  _count: { select: { jobs: { where: { status: "ACTIVE" as const } } } },
};

async function resolve(name: string, domain: string) {
  const byHost = (await prisma.company.findMany({ where: { website: { contains: domain, mode: "insensitive" } }, select }))
    .filter((c) => host(c.website) === domain);
  const byName = byHost.length
    ? []
    : (await prisma.company.findMany({ where: { name: { equals: name, mode: "insensitive" } }, select }))
        .filter((c) => !c.website || core(host(c.website)) === core(domain));
  // If we hold duplicates, the one with roles.
  return [...byHost, ...byName].sort((a, b) => b._count.jobs - a._count.jobs)[0] ?? null;
}

const COLLECTION_ONLY = process.argv.includes("--collection-only");

async function main() {
  const slug = process.argv[2];
  const meta = LISTS[slug];
  if (!meta) throw new Error(`unknown list "${slug}" — one of: ${Object.keys(LISTS).join(", ")}`);
  const rows = readFileSync(`scripts/lists/${slug}.txt`, "utf8").trim().split("\n").map((l) => l.split("|"));

  const ids: string[] = new Array(rows.length);
  const stats = { matched: 0, created: 0, boardsFound: 0, noBoard: [] as string[] };
  const queue = rows.map((r, i) => ({ i, name: r[0].trim(), domain: r[1].trim().toLowerCase(), what: r[2]?.trim() || null }));

  async function work() {
    for (let e = queue.shift(); e; e = queue.shift()) {
      const website = `https://${e.domain}`;
      let c = await resolve(e.name, e.domain);
      if (c) {
        stats.matched++;
        const addTag = meta.tag && !c.tags.includes(meta.tag);
        if (!c.website || (!c.description && e.what) || addTag) {
          await prisma.company.update({
            where: { id: c.id },
            data: {
              ...(!c.website ? { website } : {}),
              ...(!c.description && e.what ? { description: e.what } : {}),
              ...(addTag ? { tags: [...c.tags, meta.tag!] } : {}),
            },
          });
        }
      } else {
        stats.created++;
        c = await prisma.company.create({
          data: { name: e.name, slug: await uniqueSlug(e.name), website, description: e.what, discoveredVia: UNLISTED_COLLECTIONS.includes(slug) ? "Curated list" : meta.name, tags: meta.tag ? [meta.tag] : [] },
          select,
        });
      }
      ids[e.i] = c.id;

      if (!COLLECTION_ONLY && (c.sourceType === "manual" || c._count.jobs === 0)) {
        const board = await findCompanyBoard(c.name, c.website ?? website).catch(() => null);
        const current = c.sourceType === "manual" ? null : `${c.sourceType}:${c.sourceId}`;
        if (board && `${board.type}:${board.slug}` !== current) {
          await prisma.company.update({ where: { id: c.id }, data: { sourceType: board.type, sourceId: board.slug, atsCheckedAt: new Date() } });
          await ingestCompanyById(c.id).catch((err) => console.error("ingest failed", c!.name, err));
          stats.boardsFound++;
        } else if (!board && !current) {
          await prisma.company.update({ where: { id: c.id }, data: { atsCheckedAt: new Date() } });
          stats.noBoard.push(e.name);
        }
      }
    }
  }
  await Promise.all(Array.from({ length: 8 }, work));

  let ordered = [...new Set(ids)];
  if (meta.order === "roles") {
    const counts = new Map(
      (await prisma.job.groupBy({ by: ["companyId"], where: { companyId: { in: ordered }, status: "ACTIVE" }, _count: true }))
        .map((g) => [g.companyId, g._count]),
    );
    ordered = ordered
      .map((id, i) => ({ id, i, n: counts.get(id) ?? 0 }))
      .sort((a, b) => b.n - a.n || a.i - b.i)
      .map((x) => x.id);
  }
  const hiring = await prisma.company.count({ where: { id: { in: ordered }, jobs: { some: { status: "ACTIVE" } } } });
  const roles = await prisma.job.count({ where: { companyId: { in: ordered }, status: "ACTIVE" } });
  console.log(`${meta.name}: ${ordered.length}/${rows.length} companies (${stats.matched} on file, ${stats.created} new), ${stats.boardsFound} boards connected`);
  console.log(`${hiring} hiring · ${roles} open roles → /collections/${slug}`);
  if (stats.noBoard.length) console.log(`no readable board: ${stats.noBoard.join(", ")}`);
  if (process.argv.includes("--companies-only")) return;

  const collection = await prisma.collection.upsert({
    where: { slug },
    update: { name: meta.name, description: meta.description },
    create: { slug, name: meta.name, description: meta.description },
  });
  await prisma.$transaction([
    prisma.collectionCompany.deleteMany({ where: { collectionId: collection.id } }),
    prisma.collectionCompany.createMany({
      data: ordered.map((companyId, displayOrder) => ({ collectionId: collection.id, companyId, displayOrder })),
    }),
  ]);
  console.log("collection saved");
}

main().finally(() => prisma.$disconnect());
