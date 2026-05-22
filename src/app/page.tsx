import Link from "next/link";
import { ArrowRight, Bell, Building2, Target } from "lucide-react";
import { Button } from "@/components/ui/button";
import { signInWithGoogle } from "@/app/actions/auth";

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-background flex flex-col">
      <header className="border-b">
        <div className="mx-auto max-w-5xl flex items-center justify-between px-4 h-14">
          <span className="font-bold text-lg tracking-tight">Crush</span>
          <form action={signInWithGoogle}>
            <Button size="sm" type="submit">
              Sign in
            </Button>
          </form>
        </div>
      </header>

      <main className="flex-1 flex flex-col items-center justify-center px-4 py-24 text-center">
        <div className="max-w-xl space-y-6">
          <h1 className="text-4xl font-bold tracking-tight leading-tight">
            Stop searching for jobs.
            <br />
            Follow the companies.
          </h1>
          <p className="text-lg text-muted-foreground">
            Track companies you want to work for. Get an email the moment a matching role opens — before it's everywhere else.
          </p>
          <form action={signInWithGoogle}>
            <Button size="lg" type="submit">
              Get started free
              <ArrowRight className="size-4" />
            </Button>
          </form>
        </div>

        <div className="mt-24 grid grid-cols-1 gap-8 sm:grid-cols-3 max-w-3xl text-left">
          {[
            {
              icon: Building2,
              title: "Follow companies",
              body: "Browse our curated list and track the companies you want to work for — not job listings.",
            },
            {
              icon: Target,
              title: "Set your criteria",
              body: "Tell us what you're looking for: role type, keywords, remote preference. We filter the noise.",
            },
            {
              icon: Bell,
              title: "Get notified instantly",
              body: "The moment a matching role opens, you get an email. No daily digests. No missed windows.",
            },
          ].map(({ icon: Icon, title, body }) => (
            <div key={title} className="space-y-2">
              <div className="inline-flex items-center justify-center rounded-lg bg-primary/10 p-2">
                <Icon className="size-4 text-primary" />
              </div>
              <h3 className="font-semibold">{title}</h3>
              <p className="text-sm text-muted-foreground">{body}</p>
            </div>
          ))}
        </div>
      </main>
    </div>
  );
}
