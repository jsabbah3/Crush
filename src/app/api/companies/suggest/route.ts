import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { relevantCompanySql } from "@/lib/company-relevance";

/**
 * Public typeahead for the landing-page list builder: a visitor names the
 * companies they'd leave for before they have an account. Returns only what
 * the public browse page already shows (name, logo source, open-role count),
 * only for companies that pass the same relevance gate, and never more than
 * six rows — so it can't be used to walk the table.
 */
type Row = {
  id: string;
  name: string;
  slug: string;
  website: string | null;
  industry: string | null;
  open_roles: number;
};

export async function GET(request: NextRequest) {
  const q = (request.nextUrl.searchParams.get("q") ?? "").trim().slice(0, 40);
  if (q.length < 2) return Response.json([]);

  const rows = await prisma.$queryRaw<Row[]>`
    SELECT c.id, c.name, c.slug, c.website, c.industry,
      (SELECT COUNT(*) FROM jobs j
        WHERE j.company_id = c.id AND j.status = 'ACTIVE'::job_status)::int AS open_roles
    FROM companies c
    WHERE ${relevantCompanySql} AND c.name ILIKE ${`%${q}%`}
    ORDER BY (c.name ILIKE ${`${q}%`}) DESC, open_roles DESC, c.name ASC
    LIMIT 6
  `.catch(() => [] as Row[]);

  return Response.json(
    rows.map((r) => ({
      id: r.id,
      name: r.name,
      slug: r.slug,
      website: r.website,
      industry: r.industry,
      openRoles: Number(r.open_roles),
    })),
    { headers: { "Cache-Control": "public, s-maxage=300, stale-while-revalidate=600" } },
  );
}
