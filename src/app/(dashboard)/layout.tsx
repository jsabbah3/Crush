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
      <DashboardNav user={user} />
      <main className="mx-auto max-w-5xl px-4 py-8">{children}</main>
    </div>
  );
}
