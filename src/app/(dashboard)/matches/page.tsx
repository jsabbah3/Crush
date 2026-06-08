import Link from "next/link";
import { redirect } from "next/navigation";
import { Inbox } from "lucide-react";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { RefreshMatchesButton } from "@/components/refresh-matches-button";
import { MatchesList } from "@/components/matches-list";

export default async function MatchesPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const trackedIds = await prisma.trackedCompany.findMany({
    where: { userId: user.id },
    select: { id: true },
  });

  const idList = trackedIds.map((t) => t.id);

  const [matches] = await Promise.all([
    idList.length > 0
      ? prisma.match.findMany({
          where: {
            trackedCompanyId: { in: idList },
            dismissed: false,
          },
          include: { job: { include: { company: { select: { name: true, slug: true, website: true } } } } },
          orderBy: { createdAt: "desc" },
        })
      : (Promise.resolve([]) as ReturnType<typeof prisma.match.findMany<{ include: { job: { include: { company: true } } } }>>),
    // Mark all unseen matches as seen
    idList.length > 0
      ? prisma.match.updateMany({
          where: { trackedCompanyId: { in: idList }, seenAt: null },
          data: { seenAt: new Date() },
        })
      : Promise.resolve({ count: 0 }),
  ]);

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="font-heading text-3xl font-bold tracking-tight">Matches</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Jobs that fit your criteria at companies you&apos;re tracking
          </p>
        </div>
        <RefreshMatchesButton className="pt-1" />
      </div>

      {matches.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 gap-4 text-center">
          <div className="rounded-full bg-muted/50 p-4">
            <Inbox className="size-8 text-muted-foreground/40" />
          </div>
          <div className="space-y-1.5">
            <p className="font-semibold">You&apos;re all set up</p>
            <p className="text-sm text-muted-foreground max-w-sm leading-relaxed">
              We&apos;re watching your companies daily. The moment a role opens that matches your criteria, it&apos;ll appear here — and you&apos;ll get an email.
            </p>
          </div>
          <div className="flex gap-2 mt-1">
            <Link href="/companies">
              <Button size="sm" variant="outline">Add more companies</Button>
            </Link>
            <Link href="/dashboard">
              <Button size="sm" variant="ghost" className="text-muted-foreground">Back to dashboard</Button>
            </Link>
          </div>
        </div>
      ) : (
        <MatchesList matches={matches} />
      )}
    </div>
  );
}
