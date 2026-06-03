import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { DashboardNav } from "@/components/nav";
import { UserIdentifier } from "@/components/user-identifier";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const {
    data: { user: authUser },
  } = await supabase.auth.getUser();

  if (!authUser) {
    redirect("/login");
  }

  const user = await prisma.user.findUnique({ where: { id: authUser.id } });

  const trackedIds = await prisma.trackedCompany.findMany({
    where: { userId: authUser.id },
    select: { id: true },
  });

  const unreadMatchRows = trackedIds.length > 0
    ? await prisma.match.findMany({
        where: {
          trackedCompanyId: { in: trackedIds.map((t) => t.id) },
          seenAt: null,
          dismissed: false,
        },
        select: { id: true },
      })
    : [];
  const unreadMatches = unreadMatchRows.length;

  if (!user) {
    redirect("/login");
  }

  return (
    <div className="min-h-screen bg-background">
      <UserIdentifier
        userId={user.id}
        email={user.email}
        name={user.name}
        createdAt={user.createdAt}
      />
      <DashboardNav user={user} unreadMatches={unreadMatches} />
      <main className="mx-auto max-w-6xl px-6 py-10">{children}</main>
    </div>
  );
}
