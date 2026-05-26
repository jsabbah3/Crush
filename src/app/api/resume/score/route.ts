import { NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";

const anthropic = new Anthropic();

type JobInput = {
  matchId: string;
  jobId: string;
  title: string;
  company: string;
  description: string;
};

export async function POST(req: Request) {
  if (!process.env.ANTHROPIC_API_KEY) {
    return NextResponse.json({ error: "AI scoring requires ANTHROPIC_API_KEY" }, { status: 503 });
  }

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const dbUser = await prisma.user.findUnique({
    where: { id: user.id },
    select: { resumeText: true },
  });

  if (!dbUser?.resumeText) {
    return NextResponse.json(
      { error: "No resume saved. Add your resume in Settings first." },
      { status: 400 },
    );
  }

  const { jobs } = await req.json() as { jobs: JobInput[] };
  const batch = jobs.slice(0, 10); // cap at 10 per request

  const jobList = batch
    .map((j, i) => `[${i}] ${j.title} @ ${j.company}\n${j.description.slice(0, 400)}`)
    .join("\n\n---\n\n");

  const message = await anthropic.messages.create({
    model: "claude-haiku-4-5-20251001",
    max_tokens: 1024,
    messages: [
      {
        role: "user",
        content: `Score how well each job matches this candidate. Return a JSON array only — no markdown, no explanation:

[{"index": 0, "score": 85, "reasoning": "one clear sentence"}, ...]

Score 0-100 (100 = perfect fit). Be calibrated — most jobs won't be above 80.

Candidate resume:
${dbUser.resumeText.slice(0, 2500)}

Jobs:
${jobList}`,
      },
    ],
  });

  const raw = message.content[0].type === "text" ? message.content[0].text : "";
  let parsed: { index: number; score: number; reasoning: string }[];
  try {
    parsed = JSON.parse(raw);
  } catch {
    return NextResponse.json({ error: "AI returned an unexpected format" }, { status: 500 });
  }

  const scores = parsed
    .map((s) => ({
      matchId: batch[s.index]?.matchId ?? "",
      jobId: batch[s.index]?.jobId ?? "",
      score: Math.min(100, Math.max(0, Math.round(s.score))),
      reasoning: s.reasoning,
    }))
    .filter((s) => s.matchId);

  return NextResponse.json({ scores });
}
