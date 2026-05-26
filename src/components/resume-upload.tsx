"use client";

import { useState, useRef, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Loader2, Upload, Trash2, Sparkles, Check, Plus } from "lucide-react";
import { useRouter } from "next/navigation";
import { addTrackedRole } from "@/app/actions/roles";

type AnalysisResult = {
  suggestedRoles: string[];
  summary: string;
  strengths: string[];
};

type TrackedRole = { id: string; title: string };

export function ResumeUpload({
  initialResumeText,
  userId,
  initialTrackedRoles = [],
}: {
  initialResumeText: string | null;
  userId: string;
  initialTrackedRoles?: TrackedRole[];
}) {
  const router = useRouter();
  const [text, setText] = useState(initialResumeText ?? "");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  // Track which roles have been added this session (optimistic)
  const [addedRoles, setAddedRoles] = useState<Set<string>>(new Set());
  const [isPending, startTransition] = useTransition();
  const fileRef = useRef<HTMLInputElement>(null);

  const trackedTitles = new Set([
    ...initialTrackedRoles.map((r) => r.title.toLowerCase()),
    ...[...addedRoles].map((r) => r.toLowerCase()),
  ]);

  async function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const content = await file.text();
    setText(content);
  }

  async function analyzeResume() {
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      const res = await fetch("/api/resume", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ resumeText: text }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error ?? "Analysis failed");
      }
      const data = await res.json() as AnalysisResult;
      setResult(data);
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  async function removeResume() {
    setLoading(true);
    try {
      await fetch("/api/resume", { method: "DELETE" });
      setText("");
      setResult(null);
      router.refresh();
    } finally {
      setLoading(false);
    }
  }

  function handleAddRole(role: string) {
    startTransition(async () => {
      await addTrackedRole(role);
      setAddedRoles((prev) => new Set([...prev, role]));
      router.refresh();
    });
  }

  const hasText = text.trim().length >= 50;

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">
        Paste your resume below. Claude will suggest roles you might not have considered based on your background.
      </p>

      <div className="space-y-2">
        <textarea
          placeholder="Paste resume text here…"
          value={text}
          onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setText(e.target.value)}
          rows={8}
          className="w-full rounded-md border border-input bg-background px-3 py-2 font-mono text-xs resize-y focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
        />
        <div className="flex items-center gap-2">
          <input
            ref={fileRef}
            type="file"
            accept=".txt,.md"
            className="hidden"
            onChange={handleFileUpload}
          />
          <Button
            variant="outline"
            size="sm"
            onClick={() => fileRef.current?.click()}
          >
            <Upload className="size-3.5 mr-1.5" />
            Upload .txt file
          </Button>
          {initialResumeText && (
            <Button
              variant="ghost"
              size="sm"
              onClick={removeResume}
              disabled={loading}
              className="text-destructive hover:text-destructive"
            >
              <Trash2 className="size-3.5 mr-1.5" />
              Remove
            </Button>
          )}
        </div>
      </div>

      {error && <p className="text-sm text-destructive">{error}</p>}

      <Button
        onClick={analyzeResume}
        disabled={!hasText || loading}
        size="sm"
      >
        {loading ? (
          <Loader2 className="size-3.5 mr-1.5 animate-spin" />
        ) : (
          <Sparkles className="size-3.5 mr-1.5" />
        )}
        {loading ? "Analyzing…" : "Analyze with AI"}
      </Button>

      {result && (
        <div className="rounded-lg border bg-muted/40 p-4 space-y-4">
          <p className="text-sm leading-relaxed">{result.summary}</p>

          <div className="space-y-2">
            <div>
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-0.5">Suggested roles to track</p>
              <p className="text-xs text-muted-foreground">Click + to add a role to your tracked roles</p>
            </div>
            <div className="flex flex-wrap gap-2">
              {result.suggestedRoles.map((role) => {
                const isTracked = trackedTitles.has(role.toLowerCase());
                return (
                  <button
                    key={role}
                    onClick={() => !isTracked && handleAddRole(role)}
                    disabled={isTracked || isPending}
                    className={[
                      "flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium transition-all",
                      isTracked
                        ? "border-green-500/30 bg-green-500/10 text-green-700 dark:text-green-400 cursor-default"
                        : "border-border bg-background hover:border-foreground/40 hover:bg-muted cursor-pointer",
                    ].join(" ")}
                  >
                    {role}
                    {isTracked ? (
                      <Check className="size-3 shrink-0" />
                    ) : (
                      <Plus className="size-3 shrink-0 text-muted-foreground" />
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {result.strengths.length > 0 && (
            <div className="space-y-1.5">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Key strengths</p>
              <div className="flex flex-wrap gap-1.5">
                {result.strengths.map((s) => (
                  <span key={s} className="rounded-md border border-border bg-background px-2 py-0.5 text-xs text-muted-foreground">
                    {s}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
