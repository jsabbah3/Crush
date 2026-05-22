import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { SiteNav } from "@/components/site-nav";

export default async function BrowseLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const {
    data: { user: authUser },
  } = await supabase.auth.getUser();

  let profile = null;
  if (authUser) {
    profile = await prisma.user.findUnique({ where: { id: authUser.id } });
  }

  return (
    <div className="min-h-screen bg-background">
      <SiteNav user={profile} />
      <main className="mx-auto max-w-5xl px-4 py-8">{children}</main>
    </div>
  );
}
