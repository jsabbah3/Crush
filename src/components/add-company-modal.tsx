"use client";

import { useState, useTransition, useRef, useEffect } from "react";
import { Plus, X, Loader2, CheckCircle, AlertCircle, Building2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { addCustomCompany } from "@/app/actions/companies";

export function AddCompanyModal() {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [website, setWebsite] = useState("");
  const [isPending, startTransition] = useTransition();
  const [result, setResult] = useState<{ type: "success" | "exists" | "error"; message: string } | null>(null);
  const router = useRouter();
  const nameRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open) setTimeout(() => nameRef.current?.focus(), 50);
  }, [open]);

  function handleClose() {
    setOpen(false);
    setName("");
    setWebsite("");
    setResult(null);
  }

  function handleSubmit() {
    if (!name.trim()) return;
    setResult(null);
    startTransition(async () => {
      const res = await addCustomCompany(name, website);
      if (res.status === "error") {
        setResult({ type: "error", message: res.message });
        return;
      }
      if (res.status === "exists") {
        setResult({ type: "exists", message: "Already in our database — added to your list!" });
        router.refresh();
        setTimeout(handleClose, 1800);
        return;
      }
      // added
      const msg = res.atsFound
        ? `Added! Found ${res.jobCount} open role${res.jobCount === 1 ? "" : "s"} via their job board.`
        : "Added! No job board detected — we'll check periodically.";
      setResult({ type: "success", message: msg });
      router.refresh();
      setTimeout(handleClose, 2200);
    });
  }

  return (
    <>
      <Button
        variant="outline"
        size="sm"
        className="shrink-0"
        onClick={() => setOpen(true)}
      >
        <Building2 className="size-3.5" />
        Add a company
      </Button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/40"
            onClick={handleClose}
          />

          {/* Modal */}
          <div className="relative w-full max-w-md rounded-xl border bg-background shadow-xl p-6 space-y-5">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h2 className="font-semibold text-base">Add a company</h2>
                <p className="text-sm text-muted-foreground mt-0.5">
                  We'll detect their job board and pull open roles automatically.
                </p>
              </div>
              <button onClick={handleClose} className="text-muted-foreground hover:text-foreground transition-colors mt-0.5">
                <X className="size-4" />
              </button>
            </div>

            <div className="space-y-3">
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                  Company name <span className="text-destructive">*</span>
                </label>
                <Input
                  ref={nameRef}
                  placeholder="e.g. Stripe"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
                  disabled={isPending}
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                  Website <span className="text-muted-foreground font-normal normal-case">(optional but recommended)</span>
                </label>
                <Input
                  placeholder="e.g. stripe.com"
                  value={website}
                  onChange={(e) => setWebsite(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
                  disabled={isPending}
                />
              </div>
            </div>

            {/* Result feedback */}
            {result && (
              <div className={`flex items-start gap-2 rounded-lg px-3 py-2.5 text-sm ${
                result.type === "error"
                  ? "bg-destructive/10 text-destructive"
                  : "bg-green-500/10 text-green-700 dark:text-green-400"
              }`}>
                {result.type === "error"
                  ? <AlertCircle className="size-4 shrink-0 mt-0.5" />
                  : <CheckCircle className="size-4 shrink-0 mt-0.5" />
                }
                {result.message}
              </div>
            )}

            {/* Loading state */}
            {isPending && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="size-4 animate-spin" />
                Detecting job board…
              </div>
            )}

            <div className="flex justify-end gap-2 pt-1">
              <Button variant="outline" size="sm" onClick={handleClose} disabled={isPending}>
                Cancel
              </Button>
              <Button size="sm" onClick={handleSubmit} disabled={isPending || !name.trim()}>
                <Plus className="size-3.5" />
                Add company
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
