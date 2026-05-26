import { NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";

const anthropic = new Anthropic();

export async function POST(req: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { resumeText } = await req.json() as { resumeText: string };
  if (!resumeText || resumeText.trim().length < 50) {
    return NextResponse.json({ error: "Resume text too short" }, { status: 400 });
  }

  // Save resume text to user record
  await prisma.user.update({
    where: { id: user.id },
    data: { resumeText: resumeText.trim() },
  });

  // Ask Claude to parse the resume and suggest roles + companies
  const message = await anthropic.messages.create({
    model: "claude-haiku-4-5-20251001",
    max_tokens: 1024,
    messages: [
      {
        role: "user",
        content: `You are a career coach who specializes in surfacing modern, AI-era job titles that candidates don't know to search for. Analyze this resume and return a JSON object with:
- "suggestedRoles": array of 8-12 job title strings. Mix these three types:
  1. OBVIOUS FITS: 2-3 roles clearly matching their experience
  2. LATERAL MOVES: roles they're qualified for but probably haven't searched (e.g. a backend engineer → "Solutions Engineer", "Developer Advocate", "Forward Deployed Engineer")
  3. AI-ERA TITLES: modern startup roles that didn't exist 3 years ago that fit their profile — draw from: "AI Engineer", "LLM Engineer", "Applied AI Engineer", "Inference Engineer", "GTM Engineer", "Revenue Engineer", "Forward Deployed Engineer", "Founding Engineer", "Growth Engineer", "ML Platform Engineer", "AI Safety Engineer", "Technical Customer Success", "Developer Relations Engineer", "AI Product Manager". Only suggest these if there's a plausible connection to their background.
  Keep titles short (2-4 words). At least 3 of the 8-12 should be AI-era titles.
- "summary": 1-2 sentence plain-English summary of the person's background
- "strengths": array of 3-5 key skill/domain strengths (short labels, e.g. "TypeScript", "System Design", "Growth Strategy")

Return ONLY valid JSON, no markdown, no explanation.

Resume:
${resumeText.slice(0, 4000)}`,
      },
    ],
  });

  let parsed: { suggestedRoles: string[]; summary: string; strengths: string[] };
  try {
    const raw = message.content[0].type === "text" ? message.content[0].text : "";
    parsed = JSON.parse(raw);
  } catch {
    return NextResponse.json({ error: "Failed to parse AI response" }, { status: 500 });
  }

  return NextResponse.json(parsed);
}

export async function DELETE(req: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  await prisma.user.update({
    where: { id: user.id },
    data: { resumeText: null },
  });

  return NextResponse.json({ ok: true });
}
