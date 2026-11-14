import type { Metadata } from "next";
import Link from "next/link";
import { PageView } from "@/components/page-analytics";
import { GoogleSignInButton } from "@/components/google-signin-button";
import { signInWithGoogle } from "@/app/actions/auth";
import { Rule, Wordmark } from "@/components/brand";

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
    <div className="flex min-h-screen flex-col bg-background">
      {/* fires for new and returning users — use signup_completed for reliable new-user signal */}
      <PageView event="signup_started" />

      <header className="flex h-14 items-center px-4 sm:px-6">
        <Link
          href="/"
          aria-label="Crush — home"
          className="rounded-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/60"
        >
          <Wordmark />
        </Link>
      </header>
      <Rule />

      <main className="flex flex-1 items-center justify-center px-4 pb-16 pt-10">
        <div className="frame w-full max-w-md shadow-[10px_10px_0_-1px_var(--foreground)]">
          <div className="space-y-7 px-6 pb-8 pt-7 sm:px-9">
            <div className="space-y-3">
              <p className="kicker">Your list is waiting</p>
              <h1 className="font-heading text-[2.4rem] font-bold leading-[0.98] tracking-[-0.045em]">
                The companies you&apos;d <span className="font-medium italic text-primary">actually</span> leave for.
              </h1>
              <p className="leading-relaxed text-muted-foreground">
                We watch their job boards every morning and email you the day your exact role opens. One email, nothing
                else.
              </p>
            </div>

            {errorMessage && (
              <p role="alert" className="border border-destructive/40 bg-destructive/10 px-3 py-2 text-center text-sm text-destructive">
                {errorMessage}
              </p>
            )}

            <div className="space-y-3">
              <form action={signInWithGoogle}>
                <GoogleSignInButton className="h-11 w-full text-[0.95rem]" variant="ink" />
              </form>
              <p className="text-xs leading-relaxed text-muted-foreground">
                Free. We only email when a role you&apos;d actually want opens up.
              </p>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
