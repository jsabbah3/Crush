"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Check, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { FollowModal } from "@/components/follow-modal";
import type { JobType } from "@/generated/prisma/enums";

type Tracked = {
  id: string;
  keywords: string[];
  jobTypes: JobType[];
  remoteOnly: boolean | null;
  locationFilter: string | null;
  emailAlerts: boolean;
} | null;

export function FollowButton({
  company,
  tracked,
  userId,
  size = "sm",
}: {
  company: { id: string; name: string };
  tracked: Tracked;
  userId: string | null;
  size?: "sm" | "default";
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const isFollowing = !!tracked;

  function handleClick() {
    if (!userId) {
      router.push("/login");
      return;
    }
    setOpen(true);
  }

  return (
    <>
      <Button
        variant={isFollowing ? "secondary" : "default"}
        size={size}
        onClick={handleClick}
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

      <FollowModal
        open={open}
        onOpenChange={setOpen}
        company={company}
        existing={tracked ?? undefined}
      />
    </>
  );
}
