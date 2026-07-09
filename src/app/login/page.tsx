import type { Metadata } from "next";
import { Button } from "@/components/ui/button";
import { PageView } from "@/components/page-analytics";
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
    <div className="min-h-screen flex items-center justify-center bg-background">
      {/* fires for new and returning users — use signup_completed for reliable new-user signal */}
      <PageView event="signup_started" />
      <div className="w-full max-w-sm space-y-6 px-4">
        <div className="space-y-2 text-center">
          <h1 className="font-heading text-3xl font-bold tracking-tight">Welcome to Crush</h1>
          <p className="text-sm text-muted-foreground">
            Track companies. Get notified when your role opens.
          </p>
        </div>

        {errorMessage && (
          <p role="alert" className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive text-center">
            {errorMessage}
          </p>
        )}

        <form action={signInWithGoogle}>
          <Button type="submit" className="w-full" size="lg">
            Continue with Google
          </Button>
        </form>
      </div>
    </div>
  );
}
