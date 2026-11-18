/**
 * Audit: are the job boards attached to listed companies really theirs?
 *
 * A board found by slug guessing can belong to a namesake (Runway the video
 * lab got Runway the planning tool's jobs). For every company with a board
 * and open roles, check the postings we hold name the company. For the ones
 * that don't, look at the company's own website for the board it links to:
 *
 *   confirmed  — the website links to the board we have: fine
 *   replace    — the website links to a different board: swap it
 *   review     — nothing on the website settles it: a human looks
 *
 * Also lists boards attached to more than one company.
 *
 *   npx tsx --env-file=.env.local scripts/audit-boards.ts            # report only
 *   npx tsx --env-file=.env.local scripts/audit-boards.ts --apply    # swap the "replace" ones
 *   ... --apply also detaches shared boards from the companies that don't own them
 *   ... --unhook <file.json>   # detach boards from company ids listed in the file (after review)
 */
import { readFileSync, writeFileSync } from "fs";
import { prisma } from "../src/lib/prisma";
import { mentionsCompany } from "../src/lib/board-check";
import { findBoardOnSite } from "../src/lib/detect-ats";
import { ingestCompanyById } from "../src/lib/ingestion";

type Row = {
  id: string; name: string; website: string | null; board: string; open: number;
  verdict: "confirmed" | "replace" | "review" | "no-text"; siteBoard?: string; sample?: string;
};

const CHUNK = 200;
// Slugs that are bits of a URL, not a company: boards.greenhouse.io/embed/…
const JUNK_SLUG = /^(?:embed|api|v1|js|jobs|job_board|job_app)$/i;
const flag = (f: string) => process.argv.includes(f);
const arg = (f: string) => { const i = process.argv.indexOf(f); return i > 0 ? process.argv[i + 1] : undefined; };

async function pool<T>(items: T[], n: number, fn: (t: T) => Promise<void>) {
  const q = [...items];
  await Promise.all(Array.from({ length: n }, async () => { for (let t = q.shift(); t; t = q.shift()) await fn(t); }));
}

async function unhook(file: string) {
  await unhookIds(JSON.parse(readFileSync(file, "utf8")));
}

/** Detach a wrong board and close the roles it brought in. */
async function unhookIds(ids: string[]) {
  for (const id of ids) {
    const c = await prisma.company.update({ where: { id }, data: { sourceType: "manual", sourceId: null, atsCheckedAt: new Date() } });
    const closed = await prisma.job.updateMany({ where: { companyId: id, status: "ACTIVE" }, data: { status: "CLOSED" } });
    console.log(`unhooked ${c.name}: closed ${closed.count} roles`);
  }
}

async function main() {
  const unhookFile = arg("--unhook");
  if (unhookFile) return unhook(unhookFile);

  const ids = (await prisma.company.findMany({
    where: { sourceType: { not: "manual" }, sourceId: { not: null }, jobs: { some: { status: "ACTIVE" } } },
    select: { id: true },
  })).map((c) => c.id);
  console.log(`${ids.length} companies with a board and open roles`);

  const suspects: Row[] = [];
  for (let i = 0; i < ids.length; i += CHUNK) {
    const companies = await prisma.company.findMany({
      where: { id: { in: ids.slice(i, i + CHUNK) } },
      select: {
        id: true, name: true, website: true, sourceType: true, sourceId: true,
        _count: { select: { jobs: { where: { status: "ACTIVE" } } } },
        jobs: { where: { status: "ACTIVE" }, select: { title: true, description: true }, orderBy: { createdAt: "desc" }, take: 15 },
      },
    });
    for (const c of companies) {
      if (mentionsCompany(c.name, c.website, c.jobs)) continue;
      const hasText = c.jobs.some((j) => j.description.trim().length > 200);
      suspects.push({
        id: c.id, name: c.name, website: c.website, board: `${c.sourceType}:${c.sourceId}`, open: c._count.jobs,
        verdict: hasText ? "review" : "no-text",
        sample: (c.jobs[0]?.description ?? "").replace(/<[^>]+>|&[a-z#0-9]+;/gi, " ").replace(/\s+/g, " ").trim().slice(0, 160),
      });
    }
  }
  console.log(`${suspects.length} boards whose postings don't name the company — checking their websites`);

  await pool(suspects.filter((s) => s.website), 8, async (s) => {
    const site = await findBoardOnSite(s.website!);
    if (!site) return;
    s.siteBoard = `${site.type}:${site.slug}`;
    s.verdict = s.siteBoard.toLowerCase() === s.board.toLowerCase() ? "confirmed" : "replace";
    // A site linking to a board another company already has (a safety
    // nonprofit linking to Anthropic's jobs) isn't evidence it's theirs.
    if (s.verdict === "replace") {
      const taken = await prisma.company.findFirst({ where: { sourceType: site.type, sourceId: { equals: site.slug, mode: "insensitive" }, id: { not: s.id } }, select: { name: true } });
      if (taken) { s.verdict = "review"; s.sample = `site links to ${s.siteBoard}, which is ${taken.name}'s`; }
    }
  });

  // One board, several companies: at most one of them is right. The one
  // whose website links to it keeps it; the rest lose it (or get the board
  // their own site links to). No owner found → a human decides.
  const groups = await prisma.$queryRaw<{ board: string; ids: string[] }[]>`
    SELECT source_type || ':' || source_id AS board, array_agg(id::text) AS ids
    FROM companies WHERE source_id IS NOT NULL AND source_type <> 'manual'
    GROUP BY source_type, source_id HAVING count(*) > 1 ORDER BY count(*) DESC`;
  const shared: { board: string; members: { id: string; name: string; website: string | null; verdict: string; siteBoard?: string }[] }[] = [];
  await pool(groups, 4, async (g) => {
    const cs = await prisma.company.findMany({ where: { id: { in: g.ids } }, select: { id: true, name: true, website: true } });
    const members = await Promise.all(cs.map(async (c) => {
      const site = c.website ? await findBoardOnSite(c.website) : null;
      const siteBoard = site ? `${site.type}:${site.slug}` : undefined;
      const verdict = !siteBoard ? "unknown" : siteBoard.toLowerCase() === g.board.toLowerCase() ? "owner" : "replace";
      return { ...c, verdict, siteBoard };
    }));
    const owned = members.some((m) => m.verdict === "owner");
    const junk = JUNK_SLUG.test(g.board.slice(g.board.indexOf(":") + 1));
    for (const m of members) if (m.verdict === "unknown" && (owned || junk)) m.verdict = "unhook";
    shared.push({ board: g.board, members });
  });

  const by = (v: Row["verdict"]) => suspects.filter((s) => s.verdict === v);
  const out = `audit-boards-${new Date().toISOString().slice(0, 10)}.json`;
  writeFileSync(out, JSON.stringify({ suspects, shared }, null, 1));
  console.log(`\nconfirmed by website: ${by("confirmed").length}`);
  console.log(`\nREPLACE (${by("replace").length}):`);
  for (const s of by("replace")) console.log(`  ${s.name.padEnd(30)} ${s.board} → ${s.siteBoard} (${s.open} open)`);
  console.log(`\nREVIEW (${by("review").length}):`);
  for (const s of by("review")) console.log(`  ${s.name.padEnd(30)} ${s.website ?? "-"} ${s.board} (${s.open})  “${s.sample}”`);
  console.log(`\nno description text to check: ${by("no-text").length}`);
  console.log(`\nboards on several companies (${shared.length}):`);
  for (const g of shared) console.log(`  ${g.board}: ${g.members.map((m) => `${m.name} [${m.verdict}${m.siteBoard && m.verdict === "replace" ? " → " + m.siteBoard : ""}]`).join(" | ")}`);
  console.log(`\nfull report: ${out}`);

  if (flag("--apply")) {
    const swaps = [
      ...by("replace").map((s) => ({ id: s.id, name: s.name, to: s.siteBoard! })),
      ...shared.flatMap((g) => g.members.filter((m) => m.verdict === "replace").map((m) => ({ id: m.id, name: m.name, to: m.siteBoard! }))),
    ];
    for (const s of swaps) {
      const i = s.to.indexOf(":");
      await prisma.company.update({ where: { id: s.id }, data: { sourceType: s.to.slice(0, i) as never, sourceId: s.to.slice(i + 1), atsCheckedAt: new Date() } });
      const r = await ingestCompanyById(s.id).catch((e) => { console.error(s.name, e); return null; });
      console.log(`swapped ${s.name} → ${s.to}`, r ?? "");
    }
    await unhookIds(shared.flatMap((g) => g.members.filter((m) => m.verdict === "unhook").map((m) => m.id)));
  }
}

main().finally(() => prisma.$disconnect());
