import type { Metadata } from "next";
import Link from "next/link";
import { PageView } from "@/components/page-analytics";
import { GoogleSignInButton } from "@/components/google-signin-button";
import { signInWithGoogle } from "@/app/actions/auth";
import { AirmailRule, Postmark, Wordmark } from "@/components/brand";

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

      <AirmailRule />
      <header className="flex h-14 items-center px-4 sm:px-6">
        <Link
          href="/"
          aria-label="Crush — home"
          className="rounded-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/60"
        >
          <Wordmark />
        </Link>
      </header>

      <main className="flex flex-1 items-center justify-center px-4 pb-16 pt-6">
        {/* The sign-in card is an envelope: yours, addressed, waiting to be opened. */}
        <div className="airmail-frame w-full max-w-md rounded-[4px] shadow-[0_30px_60px_-30px_oklch(0.24_0.06_266/0.5)]">
          <div className="relative space-y-7 px-6 pb-8 pt-9 sm:px-9">
            <Postmark
              top="Crush Post"
              lines={["YOURS"]}
              waves={false}
              className="absolute right-4 top-4 h-14 rotate-[10deg] text-airmail/60"
            />
            <div className="space-y-3 pr-12">
              <p className="label-caps text-airmail">Your list is waiting</p>
              <h1 className="font-heading text-[2.1rem] font-black leading-[1.02] tracking-[-0.03em]">
                The companies you&apos;d{" "}
                <span className="italic text-primary">actually</span> leave for.
              </h1>
              <p className="leading-relaxed text-muted-foreground">
                We watch their job boards every morning and write the day your exact role opens. One letter, nothing else.
              </p>
            </div>

            {errorMessage && (
              <p role="alert" className="rounded-[3px] border border-destructive/30 bg-destructive/10 px-3 py-2 text-center text-sm text-destructive">
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
