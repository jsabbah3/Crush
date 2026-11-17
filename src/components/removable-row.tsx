"use client";

import { useRef, useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { X } from "lucide-react";
import { toast } from "sonner";
import { untrackCompany } from "@/app/actions/tracking";

/**
 * A row on Your list with a remove button. Removing deletes the company's
 * matches too, so nothing is deleted until the Undo toast closes: the row
 * hides at once, and Undo simply shows it again.
 */
export function RemovableRow({
  trackedId,
  name,
  children,
}: {
  trackedId: string;
  name: string;
  children: ReactNode;
}) {
  const router = useRouter();
  const [hidden, setHidden] = useState(false);
  const undone = useRef(false);
  const committed = useRef(false);

  async function commit() {
    if (undone.current || committed.current) return;
    committed.current = true;
    const res = await untrackCompany(trackedId);
    if (res && "error" in res) {
      setHidden(false);
      toast.error(`Couldn't remove ${name}. Try again.`);
      return;
    }
    router.refresh();
  }

  function remove() {
    undone.current = false;
    committed.current = false;
    setHidden(true);
    toast(`${name} removed from your list`, {
      duration: 5000,
      action: {
        label: "Undo",
        onClick: () => {
          undone.current = true;
          setHidden(false);
        },
      },
      onAutoClose: () => void commit(),
      onDismiss: () => void commit(),
    });
  }

  if (hidden) return null;

  return (
    <li className="group/row relative border-b border-foreground/15">
      {children}
      <button
        type="button"
        onClick={remove}
        aria-label={`Remove ${name} from your list`}
        title="Remove from your list"
        className="absolute right-1 top-1/2 flex size-7 -translate-y-1/2 cursor-pointer items-center justify-center text-muted-foreground/60 hover:bg-accent hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        <X className="size-4" />
      </button>
    </li>
  );
}
