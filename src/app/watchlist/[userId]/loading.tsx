import { WatchlistSkeleton } from "@/components/skeletons";
export default function Loading() {
  return (
    <div className="mx-auto max-w-6xl w-full px-6 py-12">
      <WatchlistSkeleton />
    </div>
  );
}
