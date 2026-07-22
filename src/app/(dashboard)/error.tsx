"use client";

import { PageError } from "@/components/page-error";

export default function DashboardError({
  error,
  unstable_retry,
}: {
  error: Error & { digest?: string };
  unstable_retry: () => void;
}) {
  return <PageError error={error} retry={unstable_retry} />;
}
