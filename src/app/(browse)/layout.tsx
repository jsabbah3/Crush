import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { SiteNav } from "@/components/site-nav";
import { DashboardNav } from "@/components/nav";

export default async function BrowseLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const { data: { user: authUser } } = await supabase.auth.getUser();

  if (authUser) {
    const [profile, trackedIds] = await Promise.all([
      prisma.user.findUnique({ where: { id: authUser.id } }),
      prisma.trackedCompany.findMany({
        where: { userId: authUser.id },
        select: { id: true },
      }),
    ]);

    const unreadMatches = trackedIds.length > 0
      ? await prisma.match.findMany({
          where: {
            trackedCompanyId: { in: trackedIds.map((t) => t.id) },
            seenAt: null,
            dismissed: false,
          },
          select: { id: true },
        }).then((r) => r.length)
      : 0;

    return (
      <div className="min-h-screen bg-background">
        <DashboardNav
          user={profile ?? { email: authUser.email!, name: null, avatarUrl: null }}
          unreadMatches={unreadMatches}
        />
        <main className="mx-auto max-w-5xl px-4 py-8">{children}</main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <SiteNav user={null} />
      <main className="mx-auto max-w-5xl px-4 py-8">{children}</main>
    </div>
  );
}
