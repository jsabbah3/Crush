import { prisma } from "@/lib/prisma";

export interface SnapshotResult {
  capturedOn: string;
  companiesSnapshotted: number;
  trackingStartedSet: number;
}

/**
 * Capture today's open-role count for every company.
 *
 * One row per company per day in company_role_snapshots — the time-series
 * behind hiring-momentum trends. Idempotent: re-running on the same day
 * updates that day's row instead of duplicating it.
 */
export async function captureRoleSnapshots(): Promise<SnapshotResult> {
  // Companies not yet tracked (added after the migration backfill, no jobs
  // ingested yet) start their reliable-data clock at first snapshot.
  const trackingStartedSet = await prisma.$executeRaw`
    UPDATE companies
    SET tracking_started_at = CURRENT_TIMESTAMP
    WHERE tracking_started_at IS NULL
  `;

  // Zero is data: a company dropping to 0 open roles is part of the trend,
  // so snapshot every company (LEFT JOIN), not just those with active jobs.
  const companiesSnapshotted = await prisma.$executeRaw`
    INSERT INTO company_role_snapshots (company_id, captured_on, open_roles_total)
    SELECT c.id, CURRENT_DATE, count(j.id) FILTER (WHERE j.status = 'ACTIVE')
    FROM companies c
    LEFT JOIN jobs j ON j.company_id = c.id
    GROUP BY c.id
    ON CONFLICT (company_id, captured_on)
    DO UPDATE SET open_roles_total = EXCLUDED.open_roles_total
  `;

  return {
    capturedOn: new Date().toISOString().slice(0, 10),
    companiesSnapshotted,
    trackingStartedSet,
  };
}
