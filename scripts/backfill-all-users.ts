/**
 * Retroactively create Match rows for all users who followed companies
 * before the backfill-on-follow logic was deployed.
 *
 * Usage:
 *   npx tsx scripts/backfill-all-users.ts             # dry-run (no writes)
 *   npx tsx scripts/backfill-all-users.ts --apply     # write to DB
 *   npx tsx scripts/backfill-all-users.ts --user=<id> # single user only
 */

import { config } from "dotenv";
config({ path: ".env.local" });
config();

import { PrismaClient } from "../src/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { doesJobMatch } from "../src/lib/matching";

const adapter = new PrismaPg({ connectionString: process.env.DIRECT_URL ?? process.env.DATABASE_URL! });
const prisma = new PrismaClient({ adapter } as any);

const DRY_RUN = !process.argv.includes("--apply");
const TARGET_USER = process.argv.find((a) => a.startsWith("--user="))?.split("=")[1] ?? null;

type UserPrefs = {
  seniority?: string[];
  remoteOnly?: boolean | null;
  locationFilter?: string | null;
};

async function backfillUser(userId: string): Promise<{ checked: number; created: number }> {
  const dbUser = await prisma.user.findUnique({
    where: { id: userId },
    select: { defaultCriteria: true },
  });
  const prefs = dbUser?.defaultCriteria as UserPrefs | null;

  const roles = await prisma.trackedRole.findMany({
    where: { userId },
    select: { title: true },
  });
  const roleTitles = roles.map((r) => r.title);
  if (roleTitles.length === 0) return { checked: 0, created: 0 };

  const trackedCompanies = await prisma.trackedCompany.findMany({
    where: { userId },
    select: { id: true, companyId: true },
  });
  if (trackedCompanies.length === 0) return { checked: 0, created: 0 };

  const tcMap = new Map(trackedCompanies.map((tc) => [tc.companyId, tc.id]));

  const jobs = await prisma.job.findMany({
    where: {
      companyId: { in: trackedCompanies.map((tc) => tc.companyId) },
      status: "ACTIVE",
    },
  });

  // Fetch all existing matches (including dismissed) so we can create or un-dismiss
  const existingMatches = await prisma.match.findMany({
    where: {
      trackedCompanyId: { in: trackedCompanies.map((tc) => tc.id) },
    },
    select: { id: true, jobId: true, trackedCompanyId: true, dismissed: true },
  });
  const existingMap = new Map(existingMatches.map((m) => [`${m.trackedCompanyId}:${m.jobId}`, m]));

  let checked = 0;
  let created = 0;

  for (const job of jobs) {
    checked++;
    if (!doesJobMatch(
      job,
      roleTitles,
      prefs?.seniority ?? [],
      prefs?.remoteOnly ?? null,
      prefs?.locationFilter ?? null,
    )) continue;

    const trackedCompanyId = tcMap.get(job.companyId);
    if (!trackedCompanyId) continue;

    const key = `${trackedCompanyId}:${job.id}`;
    const existing = existingMap.get(key);

    if (existing && !existing.dismissed) continue; // already active — skip

    created++;
    if (!DRY_RUN) {
      if (existing?.dismissed) {
        // Un-dismiss match that was auto-dismissed by role removal
        await prisma.match.update({ where: { id: existing.id }, data: { dismissed: false } });
      } else {
        try {
          await prisma.match.create({ data: { trackedCompanyId, jobId: job.id } });
        } catch {
          // race condition / unique constraint — fine
          created--;
        }
      }
    }
  }

  return { checked, created };
}

async function main() {
  console.log(`Mode: ${DRY_RUN ? "DRY RUN (pass --apply to write)" : "APPLY"}`);

  let userIds: string[];

  if (TARGET_USER) {
    userIds = [TARGET_USER];
  } else {
    const users = await prisma.user.findMany({ select: { id: true } });
    userIds = users.map((u) => u.id);
  }

  console.log(`Processing ${userIds.length} user(s)…\n`);

  let totalChecked = 0;
  let totalCreated = 0;

  for (const userId of userIds) {
    const { checked, created } = await backfillUser(userId);
    totalChecked += checked;
    totalCreated += created;
    if (checked > 0 || created > 0) {
      console.log(`  user ${userId.slice(0, 8)}…  checked=${checked}  new_matches=${created}`);
    }
  }

  console.log(`\nDone. Total jobs checked: ${totalChecked}. Matches ${DRY_RUN ? "that would be" : ""} created: ${totalCreated}.`);
  await prisma.$disconnect();
}

main().catch((e) => { console.error(e); process.exit(1); });
