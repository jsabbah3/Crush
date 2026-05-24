import { redirect } from "next/navigation";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { Button } from "@/components/ui/button";
import { CompanyLogo } from "@/components/company-logo";
import { signInWithGoogle } from "@/app/actions/auth";
import { prisma } from "@/lib/prisma";

const FEATURED = [
  { name: "Stripe",    website: "https://stripe.com" },
  { name: "Vercel",    website: "https://vercel.com" },
  { name: "Linear",    website: "https://linear.app" },
  { name: "Anthropic", website: "https://anthropic.com" },
  { name: "OpenAI",    website: "https://openai.com" },
  { name: "Figma",     website: "https://figma.com" },
];

const FEATURES = [
  {
    emoji: "🏢",
    title: "Pick your companies",
    body: "Browse a curated list and follow the companies you'd actually want to work for — not job listings.",
  },
  {
    emoji: "🎯",
    title: "Define your criteria",
    body: "Set role titles, seniority, and remote preference. We match every new posting against your exact spec.",
  },
  {
    emoji: "🔔",
    title: "Get the alert first",
    body: "One email the moment a matching role goes live. No daily digests, no noise — just signal.",
  },
];

export default async function HomePage() {
  const supabase = await createClient();
  const {
    data: { user: authUser },
  } = await supabase.auth.getUser();

  if (authUser) redirect("/dashboard");

  const companyCount = await prisma.company.count();

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Nav */}
      <header className="border-b sticky top-0 z-10 bg-background">
        <div className="mx-auto max-w-5xl flex items-center justify-between px-4 h-12">
          <span className="font-heading font-bold text-lg tracking-tight">Crush</span>
          <div className="flex items-center gap-2">
            <Link href="/companies">
              <Button variant="ghost" size="sm" className="text-muted-foreground text-xs">
                Browse companies
              </Button>
            </Link>
            <form action={signInWithGoogle}>
              <Button size="sm" type="submit" className="text-xs h-7 px-3">
                Get started →
              </Button>
            </form>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="flex-1 flex flex-col items-center justify-center px-4 py-28 text-center">
        <div className="max-w-3xl space-y-8">
          <h1 className="font-heading text-6xl font-bold tracking-tight leading-[1.05] sm:text-7xl lg:text-[5rem]">
            The role you want,
            <br />
            at the companies
            <br />
            you care about.
          </h1>

          <p className="text-lg text-muted-foreground max-w-md mx-auto leading-relaxed">
            Pick the companies you&apos;d actually work for. Set your role criteria. Get one email
            the moment your exact match opens — before it hits LinkedIn.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
            <form action={signInWithGoogle}>
              <Button size="lg" type="submit" className="gap-2 px-8">
                Get started free
                <ArrowRight className="size-4" />
              </Button>
            </form>
            <Link href="/companies">
              <Button size="lg" variant="outline" className="px-8">
                Browse {companyCount} companies
              </Button>
            </Link>
          </div>

          {/* Company logo strip */}
          <div className="pt-6 space-y-3">
            <p className="text-xs text-muted-foreground uppercase tracking-widest font-medium">
              Companies on Crush
            </p>
            <div className="flex items-center gap-4 flex-wrap justify-center">
              {FEATURED.map((c) => (
                <div
                  key={c.name}
                  title={c.name}
                  className="opacity-40 hover:opacity-70 transition-opacity grayscale"
                >
                  <CompanyLogo name={c.name} website={c.website} size="sm" />
                </div>
              ))}
              <span className="text-xs text-muted-foreground">
                + {companyCount - FEATURED.length} more
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="border-t bg-card">
        <div className="mx-auto max-w-5xl px-4 py-20">
          <h2 className="font-heading text-3xl font-bold mb-12">How it works</h2>
          <div className="grid grid-cols-1 gap-8 sm:grid-cols-3">
            {FEATURES.map(({ emoji, title, body }) => (
              <div key={title} className="space-y-3">
                <div className="text-3xl">{emoji}</div>
                <h3 className="font-heading font-bold text-base">{title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Positioning */}
      <section className="border-t">
        <div className="mx-auto max-w-3xl px-4 py-24 space-y-6">
          <h2 className="font-heading text-4xl font-bold leading-tight">
            Built for people who know exactly what they&apos;re looking for.
          </h2>
          <p className="text-muted-foreground leading-relaxed max-w-xl">
            Not a job board. Not a recruiter inbox. Crush is for senior tech professionals with
            a shortlist of dream companies and a specific role in mind. We monitor those
            companies every day so you don&apos;t have to.
          </p>
          <form action={signInWithGoogle}>
            <Button size="lg" type="submit" className="gap-2 mt-2">
              Start tracking for free
              <ArrowRight className="size-4" />
            </Button>
          </form>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t py-5">
        <div className="mx-auto max-w-5xl px-4 flex items-center justify-between">
          <span className="font-heading font-bold text-sm">Crush</span>
          <span className="text-xs text-muted-foreground">
            © {new Date().getFullYear()} Crush
          </span>
        </div>
      </footer>
    </div>
  );
}
