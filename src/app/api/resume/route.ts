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
        content: `You are a career coach specializing in helping people discover roles they haven't considered. Analyze this resume and return a JSON object with:
- "suggestedRoles": array of 8-12 job title strings. Include a mix of: (1) obvious fits based on their experience, (2) lateral moves they probably haven't considered (e.g. a software engineer might suit "Developer Advocate", "Technical PM", "Solutions Engineer", "ML Engineer", "Platform Engineer"), and (3) emerging/modern role titles at startups (e.g. "GTM Engineer", "Revenue Engineer", "Founding Engineer", "AI Engineer"). Keep titles short (2-4 words). Prioritize variety and surprise over the obvious.
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
