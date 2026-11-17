/**
 * Re-run the current matcher over every open match and dismiss the ones it
 * no longer accepts — the cleanup that goes with a matcher change.
 *
 * Only touches matches that are still untouched in the inbox (not dismissed,
 * status INTERESTED); anything a user marked Applied, Interviewing etc. stays.
 * Dismissal is a flag, so this is reversible: --apply writes the dismissed
 * match ids to a JSON file, and --undo <file> restores them.
 *
 *   npx tsx --env-file=.env.local scripts/rematch-open-matches.ts            # dry run
 *   npx tsx --env-file=.env.local scripts/rematch-open-matches.ts --apply
 *   npx tsx --env-file=.env.local scripts/rematch-open-matches.ts --undo <file>
 */
import { writeFileSync, readFileSync } from "fs";
import { prisma } from "../src/lib/prisma";
import { doesJobMatch } from "../src/lib/matching";

type Prefs = { seniority?: string[]; remoteOnly?: boolean | null; locationFilter?: string | null } | null;

async function undo(file: string) {
  const ids = JSON.parse(readFileSync(file, "utf8")) as string[];
  const res = await prisma.match.updateMany({ where: { id: { in: ids } }, data: { dismissed: false } });
  console.log(`Restored ${res.count} of ${ids.length} matches from ${file}`);
}

async function run(apply: boolean) {
  const users = await prisma.user.findMany({ select: { id: true, defaultCriteria: true } });
  const drop: string[] = [];
  let kept = 0;

  for (const u of users) {
    const roles = (await prisma.trackedRole.findMany({ where: { userId: u.id }, select: { title: true } })).map((r) => r.title);
    const prefs = u.defaultCriteria as Prefs;
    const open = await prisma.match.findMany({
      where: { trackedCompany: { userId: u.id }, dismissed: false, applicationStatus: "INTERESTED" },
      include: { job: true },
    });
    for (const m of open) {
      const ok = doesJobMatch(m.job, roles, prefs?.seniority ?? [], prefs?.remoteOnly ?? null, prefs?.locationFilter ?? null);
      if (ok) kept++;
      else drop.push(m.id);
    }
  }

  console.log(`Open matches: ${kept + drop.length}. Keep ${kept}, dismiss ${drop.length}.`);
  if (!apply || drop.length === 0) {
    if (!apply) console.log("Dry run — pass --apply to dismiss.");
    return;
  }

  const file = `rematch-undo-${new Date().toISOString().slice(0, 19).replace(/[:T]/g, "-")}.json`;
  writeFileSync(file, JSON.stringify(drop));
  for (let i = 0; i < drop.length; i += 500) {
    await prisma.match.updateMany({ where: { id: { in: drop.slice(i, i + 500) } }, data: { dismissed: true } });
  }
  console.log(`Dismissed ${drop.length}. Undo list written to ${file}`);
}

const args = process.argv.slice(2);
const main = args[0] === "--undo" ? undo(args[1]) : run(args.includes("--apply"));
main.finally(() => prisma.$disconnect());
