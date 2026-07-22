import Link from "next/link";
import { redirect } from "next/navigation";
import { Inbox, Target } from "lucide-react";
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

  const [matches, , roleCount] = await Promise.all([
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
    prisma.trackedRole.count({ where: { userId: user.id } }),
  ]);

  const hasCompanies = idList.length > 0;
  const hasRoles = roleCount > 0;

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
        hasCompanies && !hasRoles ? (
          // Tracking companies but no target role → nothing will ever match
          // until they add one. This is the load-bearing prompt for the
          // "no roles = no matches" rule.
          <div className="flex flex-col items-center justify-center py-20 gap-4 text-center">
            <div className="rounded-full bg-primary/10 p-4">
              <Target className="size-8 text-primary" />
            </div>
            <div className="space-y-1.5">
              <p className="font-semibold">Add a target role to get matches</p>
              <p className="text-sm text-muted-foreground max-w-sm leading-relaxed">
                You&apos;re tracking companies, but we don&apos;t know which roles you want yet — so nothing matches. Add a role or two and we&apos;ll alert you the moment one opens.
              </p>
            </div>
            <Link href="/settings">
              <Button size="sm">Add your roles</Button>
            </Link>
          </div>
        ) : !hasCompanies ? (
          // No companies yet
          <div className="flex flex-col items-center justify-center py-20 gap-4 text-center">
            <div className="rounded-full bg-muted/50 p-4">
              <Inbox className="size-8 text-muted-foreground/40" />
            </div>
            <div className="space-y-1.5">
              <p className="font-semibold">Follow a company to get started</p>
              <p className="text-sm text-muted-foreground max-w-sm leading-relaxed">
                Track the companies you&apos;d actually leave for, and we&apos;ll watch their careers pages so you don&apos;t have to.
              </p>
            </div>
            <Link href="/companies">
              <Button size="sm">Browse companies</Button>
            </Link>
          </div>
        ) : (
          // Companies + roles set, nothing open yet
          <div className="flex flex-col items-center justify-center py-20 gap-4 text-center">
            <div className="rounded-full bg-muted/50 p-4">
              <Inbox className="size-8 text-muted-foreground/40" />
            </div>
            <div className="space-y-1.5">
              <p className="font-semibold">You&apos;re all set up</p>
              <p className="text-sm text-muted-foreground max-w-sm leading-relaxed">
                We&apos;re watching your companies daily. The moment a role opens that matches, it&apos;ll appear here — and you&apos;ll get an email.
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
        )
      ) : (
        <MatchesList matches={matches} />
      )}
    </div>
  );
}
