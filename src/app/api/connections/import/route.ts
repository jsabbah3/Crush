import { type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";

// ─── Company name normalisation ───────────────────────────────────────────────

function normalizeCompanyName(name: string): string {
  return name
    .toLowerCase()
    .replace(/[,\.!'"]/g, "")
    .replace(/\b(inc|llc|ltd|corp|corporation|co|gmbh|sa|sas|bv|ag|plc|pty|limited|incorporated)\b/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

// ─── CSV parser (handles quoted fields with commas inside) ────────────────────

function parseCSVRow(line: string): string[] {
  const result: string[] = [];
  let current = "";
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (char === '"') {
      inQuotes = !inQuotes;
    } else if (char === "," && !inQuotes) {
      result.push(current.trim());
      current = "";
    } else {
      current += char;
    }
  }
  result.push(current.trim());
  return result;
}

// ─── Route ────────────────────────────────────────────────────────────────────

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });

  let text: string;
  try {
    const formData = await request.formData();
    const file = formData.get("file") as File | null;
    if (!file) return Response.json({ error: "No file provided" }, { status: 400 });
    text = await file.text();
  } catch {
    return Response.json({ error: "Invalid request" }, { status: 400 });
  }

  // Strip BOM if present
  const cleaned = text.replace(/^﻿/, "");
  const lines = cleaned.split(/\r?\n/).map(l => l.trim()).filter(Boolean);

  // LinkedIn CSV has a few preamble lines before the real header
  const headerIdx = lines.findIndex(l =>
    l.startsWith("First Name") && l.includes("Last Name")
  );
  if (headerIdx === -1) {
    return Response.json({ error: "Could not find CSV headers. Make sure you exported from LinkedIn → Settings → Data privacy → Get a copy of your data → Connections." }, { status: 400 });
  }

  const headers = parseCSVRow(lines[headerIdx]);
  const idx = {
    firstName:   headers.indexOf("First Name"),
    lastName:    headers.indexOf("Last Name"),
    url:         headers.indexOf("URL"),
    company:     headers.indexOf("Company"),
    position:    headers.indexOf("Position"),
    connectedOn: headers.indexOf("Connected On"),
  };

  // Load all companies once, build normalised name → id map
  const allCompanies = await prisma.company.findMany({
    select: { id: true, name: true, slug: true },
  });

  const companyMap = new Map<string, string>();
  for (const c of allCompanies) {
    companyMap.set(normalizeCompanyName(c.name), c.id);
    // Also index slug as space-separated words (e.g. "scale-ai" → "scale ai")
    companyMap.set(c.slug.replace(/-/g, " "), c.id);
  }

  // Parse rows
  const toCreate: {
    userId: string;
    firstName: string;
    lastName: string;
    linkedinUrl: string | null;
    company: string;
    title: string | null;
    connectedOn: Date | null;
    companyId: string | null;
  }[] = [];

  for (const line of lines.slice(headerIdx + 1)) {
    const row = parseCSVRow(line);
    const firstName = row[idx.firstName] ?? "";
    const lastName  = row[idx.lastName]  ?? "";
    if (!firstName && !lastName) continue;

    const rawCompany = row[idx.company]  ?? "";
    const title      = row[idx.position] ?? null;
    const urlStr     = row[idx.url]      ?? null;
    const connStr    = row[idx.connectedOn] ?? null;

    const companyId = companyMap.get(normalizeCompanyName(rawCompany)) ?? null;

    let connectedOn: Date | null = null;
    if (connStr) {
      const d = new Date(connStr);
      if (!isNaN(d.getTime())) connectedOn = d;
    }

    toCreate.push({
      userId: user.id,
      firstName: firstName.trim(),
      lastName:  lastName.trim(),
      linkedinUrl: urlStr || null,
      company: rawCompany,
      title: title || null,
      connectedOn,
      companyId,
    });
  }

  // Replace existing connections for this user
  await prisma.$transaction([
    prisma.linkedInConnection.deleteMany({ where: { userId: user.id } }),
    prisma.linkedInConnection.createMany({ data: toCreate }),
  ]);

  const matched = toCreate.filter(r => r.companyId).length;
  return Response.json({ imported: toCreate.length, matched });
}
