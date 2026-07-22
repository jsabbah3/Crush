"use client";

import { useFormStatus } from "react-dom";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";

/**
 * Submit button for the Google OAuth form. Uses the parent <form>'s pending
 * state so the button shows progress during the redirect instead of sitting
 * dead and inviting a second click.
 */
export function GoogleSignInButton({
  children = "Continue with Google",
  className,
  variant = "default",
  size = "lg",
}: {
  children?: React.ReactNode;
  className?: string;
  variant?: React.ComponentProps<typeof Button>["variant"];
  size?: React.ComponentProps<typeof Button>["size"];
}) {
  const { pending } = useFormStatus();

  return (
    <Button
      type="submit"
      variant={variant}
      size={size}
      disabled={pending}
      aria-busy={pending}
      className={className}
    >
      {pending ? (
        <>
          <Loader2 className="size-4 animate-spin" />
          Redirecting…
        </>
      ) : (
        children
      )}
    </Button>
  );
}
