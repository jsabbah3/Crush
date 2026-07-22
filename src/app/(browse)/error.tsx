"use client";

import { PageError } from "@/components/page-error";

export default function BrowseError({
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
      title="Couldn't load this"
      message="Something hiccuped while fetching companies. Give it another go."
    />
  );
}
