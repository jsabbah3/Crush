import { cn } from "@/lib/utils";

/**
 * Shimmer placeholder. Always size it to match the final content so the real
 * UI lands with zero layout shift (see globals.css `.skeleton`).
 */
function Skeleton({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="skeleton"
      aria-hidden="true"
      className={cn("skeleton", className)}
      {...props}
    />
  );
}

export { Skeleton };
