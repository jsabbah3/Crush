import Link from "next/link";
import { skipOnboarding } from "@/app/actions/onboarding";
import { Button } from "@/components/ui/button";

export default function OnboardingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-background flex flex-col">
      <header className="border-b px-6 py-3 flex items-center justify-between">
        <span className="font-heading font-bold text-lg tracking-tight">Crush</span>
        <form action={skipOnboarding}>
          <Button type="submit" variant="ghost" size="sm" className="text-muted-foreground">
            Skip setup
          </Button>
        </form>
      </header>
      <main className="flex-1 flex items-start justify-center py-12 px-4">
        <div className="w-full max-w-2xl">{children}</div>
      </main>
    </div>
  );
}
