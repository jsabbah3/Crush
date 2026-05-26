"use client";

import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Loader2, Upload, Trash2, Sparkles } from "lucide-react";
import { useRouter } from "next/navigation";

type AnalysisResult = {
  suggestedRoles: string[];
  summary: string;
  strengths: string[];
};

export function ResumeUpload({
  initialResumeText,
  userId,
}: {
  initialResumeText: string | null;
  userId: string;
}) {
  const router = useRouter();
  const [text, setText] = useState(initialResumeText ?? "");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  async function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    // Read file as plain text (works for .txt; .pdf extraction is limited in browser)
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

  const hasText = text.trim().length >= 50;

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">
        Paste your resume below. Claude will suggest roles and companies to track based on your background.
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
        <div className="rounded-lg border bg-muted/40 p-4 space-y-3">
          <p className="text-sm">{result.summary}</p>

          <div className="space-y-1.5">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Suggested roles to track</p>
            <div className="flex flex-wrap gap-1.5">
              {result.suggestedRoles.map((role) => (
                <Badge key={role} variant="secondary" className="text-xs">
                  {role}
                </Badge>
              ))}
            </div>
          </div>

          <div className="space-y-1.5">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Key strengths</p>
            <div className="flex flex-wrap gap-1.5">
              {result.strengths.map((s) => (
                <Badge key={s} variant="outline" className="text-xs">
                  {s}
                </Badge>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
