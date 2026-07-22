import type { Metadata } from "next";
import Link from "next/link";
import { PageView } from "@/components/page-analytics";
import { GoogleSignInButton } from "@/components/google-signin-button";
import { signInWithGoogle } from "@/app/actions/auth";

export const metadata: Metadata = {
  title: "Sign in — Crush",
  robots: { index: false },
};

const ERROR_MESSAGES: Record<string, string> = {
  oauth_error: "Google sign-in didn't complete. Please try again.",
  exchange_failed: "We couldn't finish signing you in. Please try again.",
  missing_code: "Something interrupted the sign-in. Please try again.",
};

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;
  const errorMessage = error
    ? ERROR_MESSAGES[error] ?? "Sign-in failed. Please try again."
    : null;

  return (
    <div className="min-h-screen flex flex-col bg-background">
      {/* fires for new and returning users — use signup_completed for reliable new-user signal */}
      <PageView event="signup_started" />

      {/* Minimal brand header */}
      <header className="px-6 h-14 flex items-center">
        <Link
          href="/"
          className="font-heading font-bold text-base tracking-tight rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/60"
        >
          Crush
        </Link>
      </header>

      <main className="flex-1 flex items-center justify-center px-4 pb-14">
        <div className="w-full max-w-sm space-y-8">
          <div className="space-y-3">
            <span className="inline-flex items-center gap-1.5 rounded-full border border-border bg-card px-2.5 py-1 font-mono text-[11px] uppercase tracking-wider text-muted-foreground">
              <span className="size-1.5 rounded-full bg-moss" />
              Your watchlist awaits
            </span>
            <h1 className="font-heading text-3xl font-bold tracking-tight text-balance leading-[1.1]">
              Track the companies you&apos;d{" "}
              <span className="text-primary italic">actually leave for.</span>
            </h1>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Follow your shortlist and get one alert the moment your exact role opens. No job boards, no noise.
            </p>
          </div>

          {errorMessage && (
            <p role="alert" className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive text-center">
              {errorMessage}
            </p>
          )}

          <div className="space-y-3">
            <form action={signInWithGoogle}>
              <GoogleSignInButton className="w-full" variant="ink" />
            </form>
            <p className="text-xs text-muted-foreground/80 leading-relaxed">
              We&apos;ll only email you when a role you&apos;d actually want opens up. Nothing else.
            </p>
          </div>
        </div>
      </main>
    </div>
  );
}
