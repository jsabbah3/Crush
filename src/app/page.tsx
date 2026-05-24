import { redirect } from "next/navigation";
import Link from "next/link";
import { ArrowRight, Bell, Building2, SlidersHorizontal } from "lucide-react";
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

const HOW_IT_WORKS = [
  {
    num: "1",
    icon: Building2,
    title: "Pick your companies",
    body: "Browse a curated list and follow the companies you'd actually want to work for — not job listings.",
  },
  {
    num: "2",
    icon: SlidersHorizontal,
    title: "Define your criteria",
    body: "Set role type, seniority, remote preference, and keywords. We filter every new posting against your exact spec.",
  },
  {
    num: "3",
    icon: Bell,
    title: "Get the alert first",
    body: "One email, the moment a matching role goes live. No daily digests, no noise — just signal.",
  },
];

export default async function HomePage() {
  const supabase = await createClient();
  const {
    data: { user: authUser },
  } = await supabase.auth.getUser();

  if (authUser) {
    redirect("/dashboard");
  }

  const companyCount = await prisma.company.count();

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Nav */}
      <header className="border-b border-border/60 sticky top-0 z-10 bg-background/95 backdrop-blur">
        <div className="mx-auto max-w-5xl flex items-center justify-between px-4 h-14">
          <span className="font-heading italic font-bold text-xl text-primary tracking-tight">
            Crush
          </span>
          <div className="flex items-center gap-2">
            <Link href="/companies">
              <Button variant="ghost" size="sm" className="text-muted-foreground">
                Browse companies
              </Button>
            </Link>
            <form action={signInWithGoogle}>
              <Button size="sm" type="submit">
                Sign in
              </Button>
            </form>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="flex-1 flex flex-col items-center justify-center px-4 py-24 text-center">
        {/* Eyebrow */}
        <div className="mb-8 inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-3.5 py-1 text-xs font-medium text-primary tracking-wide">
          Signal, not noise
        </div>

        <div className="max-w-3xl space-y-7">
          <h1 className="font-heading text-5xl font-bold tracking-tight leading-[1.1] sm:text-6xl lg:text-[4.25rem]">
            The role you want,
            <br />
            <span className="italic text-primary">
              at the companies you care about.
            </span>
          </h1>

          <p className="text-lg text-muted-foreground max-w-lg mx-auto leading-relaxed">
            Pick the companies you&apos;d actually work for. Tell us what role fits
            you — title, seniority, remote pref. Get one email the moment your
            exact match opens, before it hits LinkedIn.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-1">
            <form action={signInWithGoogle}>
              <Button size="lg" type="submit" className="gap-2">
                Get started free
                <ArrowRight className="size-4" />
              </Button>
            </form>
            <Link href="/companies">
              <Button size="lg" variant="outline">
                Browse {companyCount} companies
              </Button>
            </Link>
          </div>
        </div>

        {/* Company logo strip */}
        <div className="mt-16 space-y-3">
          <p className="text-xs text-muted-foreground uppercase tracking-widest">
            Companies on Crush
          </p>
          <div className="flex items-center gap-4 flex-wrap justify-center">
            {FEATURED.map((c) => (
              <div
                key={c.name}
                title={c.name}
                className="opacity-50 hover:opacity-90 transition-opacity"
              >
                <CompanyLogo name={c.name} website={c.website} size="sm" />
              </div>
            ))}
            <span className="text-xs text-muted-foreground">
              + {companyCount - FEATURED.length} more
            </span>
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="border-t border-border/60 bg-card/40">
        <div className="mx-auto max-w-5xl px-4 py-20">
          <h2 className="font-heading text-2xl font-bold text-center mb-14">
            How it works
          </h2>
          <div className="grid grid-cols-1 gap-10 sm:grid-cols-3">
            {HOW_IT_WORKS.map(({ num, icon: Icon, title, body }) => (
              <div key={title} className="space-y-3">
                <div className="flex items-center gap-3 mb-1">
                  <span className="inline-flex items-center justify-center size-6 rounded-full bg-primary text-primary-foreground text-xs font-bold shrink-0">
                    {num}
                  </span>
                  <Icon className="size-4 text-muted-foreground" />
                </div>
                <h3 className="font-semibold text-sm">{title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Positioning section */}
      <section className="border-t border-border/60">
        <div className="mx-auto max-w-2xl px-4 py-24 text-center space-y-5">
          <h2 className="font-heading text-3xl font-bold leading-tight">
            Built for people who know exactly
            <br />
            <span className="italic text-primary">what they&apos;re looking for.</span>
          </h2>
          <p className="text-muted-foreground leading-relaxed">
            Not a job board. Not a recruiter inbox. Crush is for senior tech
            professionals with a shortlist of dream companies and a specific role
            in mind. We monitor those companies every day so you don&apos;t have to.
          </p>
          <div className="pt-2">
            <form action={signInWithGoogle}>
              <Button size="lg" type="submit" className="gap-2">
                Start tracking for free
                <ArrowRight className="size-4" />
              </Button>
            </form>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border/60 py-6">
        <div className="mx-auto max-w-5xl px-4 flex items-center justify-between">
          <span className="font-heading italic font-bold text-primary">Crush</span>
          <span className="text-xs text-muted-foreground">
            © {new Date().getFullYear()} Crush
          </span>
        </div>
      </footer>
    </div>
  );
}
