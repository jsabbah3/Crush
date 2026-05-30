"use client";

import { useRef, useState } from "react";
import { Upload, Users, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";

export function NetworkImport({ existingCount }: { existingCount: number }) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [status, setStatus] = useState<"idle" | "loading" | "done" | "error">("idle");
  const [result, setResult] = useState<{ imported: number; matched: number } | null>(null);
  const [count, setCount] = useState(existingCount);

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setStatus("loading");
    try {
      const form = new FormData();
      form.append("file", file);
      const res = await fetch("/api/connections/import", { method: "POST", body: form });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Import failed");
      setResult(data);
      setCount(data.imported);
      setStatus("done");
    } catch {
      setStatus("error");
    }
  }

  return (
    <div className="space-y-4">
      <input
        ref={fileInputRef}
        type="file"
        accept=".csv"
        className="sr-only"
        onChange={handleFile}
      />

      {count > 0 && status !== "done" && (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Users className="size-4" />
          <span>{count.toLocaleString()} connections imported</span>
        </div>
      )}

      {status === "done" && result && (
        <div className="flex items-start gap-2 rounded-lg border border-emerald-200 bg-emerald-50 dark:border-emerald-800 dark:bg-emerald-950/30 p-3">
          <CheckCircle2 className="size-4 text-emerald-600 dark:text-emerald-400 mt-0.5 shrink-0" />
          <div className="text-sm">
            <p className="font-medium text-emerald-800 dark:text-emerald-300">
              {result.imported.toLocaleString()} connections imported
            </p>
            <p className="text-emerald-700 dark:text-emerald-400 text-xs mt-0.5">
              {result.matched.toLocaleString()} matched to companies on Crush
            </p>
          </div>
        </div>
      )}

      {status === "error" && (
        <p className="text-sm text-destructive">
          Upload failed. Make sure you&apos;re using the Connections.csv from LinkedIn.
        </p>
      )}

      <div className="space-y-2">
        <Button
          variant="outline"
          size="sm"
          onClick={() => fileInputRef.current?.click()}
          disabled={status === "loading"}
        >
          <Upload className="size-4" />
          {count > 0 ? "Re-import connections" : "Import LinkedIn connections"}
        </Button>

        <details className="group">
          <summary className="cursor-pointer text-xs text-muted-foreground hover:text-foreground transition-colors list-none">
            How to export from LinkedIn ↓
          </summary>
          <ol className="mt-2 text-xs text-muted-foreground space-y-1 list-decimal list-inside pl-1">
            <li>Go to <span className="font-medium text-foreground">LinkedIn → Me → Settings & Privacy</span></li>
            <li>Click <span className="font-medium text-foreground">Data privacy → Get a copy of your data</span></li>
            <li>Select <span className="font-medium text-foreground">Connections</span> only, then <span className="font-medium text-foreground">Request archive</span></li>
            <li>LinkedIn emails you a link — download the CSV and upload it here</li>
          </ol>
        </details>
      </div>
    </div>
  );
}
