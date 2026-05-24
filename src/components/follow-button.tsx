"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { Check, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { followCompany, untrackCompany } from "@/app/actions/tracking";

export function FollowButton({
  company,
  tracked,
  userId,
  size = "sm",
}: {
  company: { id: string; name: string };
  tracked: { id: string } | null;
  userId: string | null;
  size?: "sm" | "default";
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const isFollowing = !!tracked;

  function handleClick() {
    if (!userId) {
      router.push("/login");
      return;
    }
    startTransition(async () => {
      if (isFollowing) {
        await untrackCompany(tracked!.id);
      } else {
        await followCompany(company.id);
      }
    });
  }

  return (
    <Button
      variant={isFollowing ? "secondary" : "default"}
      size={size}
      onClick={handleClick}
      disabled={isPending}
      className="shrink-0"
    >
      {isFollowing ? (
        <>
          <Check className="size-3.5" />
          Following
        </>
      ) : (
        <>
          <Plus className="size-3.5" />
          Follow
        </>
      )}
    </Button>
  );
}
