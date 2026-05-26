"use client";

import { useState, useTransition } from "react";
import { Sparkles, Loader2, ChevronDown, ChevronUp } from "lucide-react";
import { Button } from "@/components/ui/button";

type JobInput = {
  matchId: string;
  jobId: string;
  title: string;
  company: string;
  description: string;
};

type ScoreResult = {
  matchId: string;
  score: number;
  reasoning: string;
};

export function AiMatchScorer({ jobs }: { jobs: JobInput[] }) {
  const [scores, setScores] = useState<Map<string, ScoreResult>>(new Map());
  const [error, setError] = useState<string | null>(null);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [isPending, startTransition] = useTransition();

  function handleScore() {
    setError(null);
    startTransition(async () => {
      const res = await fetch("/api/resume/score", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ jobs }),
      });
      const data = await res.json() as { scores?: ScoreResult[]; error?: string };
      if (!res.ok || data.error) {
        setError(data.error ?? "AI scoring failed. Make sure you have a resume saved.");
        return;
      }
      const map = new Map<string, ScoreResult>();
      for (const s of (data.scores ?? [])) {
        map.set(s.matchId, s);
      }
      setScores(map);
    });
  }

  function toggleExpand(matchId: string) {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(matchId)) next.delete(matchId);
      else next.add(matchId);
      return next;
    });
  }

  const hasScores = scores.size > 0;

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-3">
        <Button
          variant="outline"
          size="sm"
          onClick={handleScore}
          disabled={isPending || jobs.length === 0}
        >
          {isPending ? (
            <Loader2 className="size-3.5 animate-spin" />
          ) : (
            <Sparkles className="size-3.5" />
          )}
          {isPending ? "Scoring…" : hasScores ? "Re-score with AI" : "Score with AI"}
        </Button>
        {hasScores && (
          <p className="text-xs text-muted-foreground">
            Based on your saved resume
          </p>
        )}
        {error && (
          <p className="text-xs text-destructive">{error}</p>
        )}
      </div>

      {hasScores && (
        <div className="space-y-1">
          {jobs.map((job) => {
            const score = scores.get(job.matchId);
            if (!score) return null;
            const pct = score.score;
            const color =
              pct >= 80 ? "bg-emerald-500" : pct >= 60 ? "bg-amber-500" : "bg-red-400";
            const isExpanded = expanded.has(job.matchId);
            return (
              <div key={job.matchId} className="rounded-lg border bg-card px-3 py-2">
                <div className="flex items-center gap-3">
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium truncate">{job.title}</p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <div className="flex items-center gap-1.5">
                      <div className="w-16 h-1.5 rounded-full bg-muted overflow-hidden">
                        <div
                          className={`h-full rounded-full ${color}`}
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                      <span className="text-xs font-semibold w-8 text-right">{pct}%</span>
                    </div>
                    <button
                      onClick={() => toggleExpand(job.matchId)}
                      className="text-muted-foreground hover:text-foreground transition-colors"
                    >
                      {isExpanded ? (
                        <ChevronUp className="size-3.5" />
                      ) : (
                        <ChevronDown className="size-3.5" />
                      )}
                    </button>
                  </div>
                </div>
                {isExpanded && (
                  <p className="text-xs text-muted-foreground mt-1.5 leading-relaxed">
                    {score.reasoning}
                  </p>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
