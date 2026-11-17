import { prisma } from "@/lib/prisma";
import { fetchAtsJobs } from "@/lib/ingestion";
import type { CompanySource } from "@/generated/prisma/enums";

const SAMPLE = 50;

type CompanyResult = { name: string; slug: string; live: number; missing: number; stale: number; drift: number };

/**
 * Compare a sample of job boards, live, against what we hold. Companies on
 * someone's list come first (that's where a miss costs a user), topped up at
 * random. Run after the morning ingest, so any gap is a real ingestion bug,
 * not a role that went up an hour ago.
 */
export async function runCoverageCheck() {
  const ats = {
    sourceType: { in: ["greenhouse", "lever", "ashby", "gem"] as CompanySource[] },
    sourceId: { not: null },
  };
  const listed = await prisma.company.findMany({
    where: { ...ats, trackedBy: { some: {} } },
    select: { id: true, name: true, slug: true, sourceType: true, sourceId: true },
  });
  let sample = shuffle(listed).slice(0, SAMPLE);
  if (sample.length < SAMPLE) {
    const others = await prisma.company.findMany({
      where: { ...ats, id: { notIn: sample.map((c) => c.id) } },
      select: { id: true, name: true, slug: true, sourceType: true, sourceId: true },
      take: 500,
    });
    sample = sample.concat(shuffle(others).slice(0, SAMPLE - sample.length));
  }

  const results: CompanyResult[] = [];
  for (const c of sample) {
    let live;
    try {
      live = await fetchAtsJobs(c.sourceType, c.sourceId!);
    } catch {
      continue; // board unreachable right now — not a coverage signal
    }
    if (live.length === 0) continue;
    const held = await prisma.job.findMany({
      where: { companyId: c.id, externalJobId: { in: live.map((j) => j.externalJobId) } },
      select: { externalJobId: true, status: true, title: true },
    });
    const byId = new Map(held.map((j) => [j.externalJobId, j]));
    const liveIds = new Set(live.map((j) => j.externalJobId));
    const missing = live.filter((j) => byId.get(j.externalJobId)?.status !== "ACTIVE").length;
    const drift = live.filter((j) => {
      const h = byId.get(j.externalJobId);
      return h && h.title.trim() !== j.title.trim();
    }).length;
    const activeIds = await prisma.job.findMany({
      where: { companyId: c.id, status: "ACTIVE" },
      select: { externalJobId: true },
    });
    const stale = activeIds.filter((j) => j.externalJobId && !liveIds.has(j.externalJobId)).length;
    results.push({ name: c.name, slug: c.slug, live: live.length, missing, stale, drift });
  }

  const liveRoles = results.reduce((n, r) => n + r.live, 0);
  const present = liveRoles - results.reduce((n, r) => n + r.missing, 0);
  const row = await prisma.coverageCheck.create({
    data: {
      companies: results.length,
      liveRoles,
      present,
      staleActive: results.reduce((n, r) => n + r.stale, 0),
      titleDrift: results.reduce((n, r) => n + r.drift, 0),
      details: results
        .filter((r) => r.missing || r.stale || r.drift)
        .sort((a, b) => b.missing + b.stale - (a.missing + a.stale))
        .slice(0, 20),
    },
  });
  return { ...row, coverage: liveRoles ? present / liveRoles : 1 };
}

function shuffle<T>(a: T[]): T[] {
  const b = [...a];
  for (let i = b.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [b[i], b[j]] = [b[j], b[i]];
  }
  return b;
}
