"use client";

import { PageError } from "@/components/page-error";

export default function OnboardingError({
  error,
  unstable_retry,
}: {
  error: Error & { digest?: string };
  unstable_retry: () => void;
}) {
  return (
    <PageError
      error={error}
      retry={unstable_retry}
      title="Setup hit a snag"
      message="We couldn't load onboarding. Try again — your account is safe."
    />
  );
}
