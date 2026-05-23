import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { OnboardingWizard } from "@/components/onboarding-wizard";

export const metadata = {
  title: "Get started — Crush",
};

export default async function OnboardingPage() {
  const supabase = await createClient();
  const { data: { user: authUser } } = await supabase.auth.getUser();
  if (!authUser) redirect("/login");

  const [user, collections] = await Promise.all([
    prisma.user.findUnique({ where: { id: authUser.id } }),
    prisma.collection.findMany({
      include: {
        companies: {
          include: { company: { select: { name: true, website: true } } },
          orderBy: { displayOrder: "asc" },
          take: 5,
        },
        _count: { select: { companies: true } },
      },
      orderBy: { createdAt: "asc" },
    }),
  ]);

  if (!user) redirect("/login");
  if (user.onboardingComplete) redirect("/dashboard");

  return <OnboardingWizard collections={collections} />;
}
