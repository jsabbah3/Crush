import { redirect } from "next/navigation";
import Link from "next/link";
import { ArrowRight, Bell, Building2, Target } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { Button } from "@/components/ui/button";
import { CompanyLogo } from "@/components/company-logo";
import { signInWithGoogle } from "@/app/actions/auth";
import { prisma } from "@/lib/prisma";

// A few companies to show in the hero — makes it feel real
const FEATURED = [
  { name: "Stripe",    website: "https://stripe.com" },
  { name: "Vercel",    website: "https://vercel.com" },
  { name: "Linear",    website: "https://linear.app" },
  { name: "Anthropic", website: "https://anthropic.com" },
  { name: "OpenAI",    website: "https://openai.com" },
  { name: "Figma",     website: "https://figma.com" },
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
      <header className="border-b">
        <div className="mx-auto max-w-5xl flex items-center justify-between px-4 h-14">
          <span className="font-bold text-lg tracking-tight">Crush</span>
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
        <div className="max-w-2xl space-y-6">
          <h1 className="text-4xl font-bold tracking-tight leading-tight sm:text-5xl">
            Stop searching for jobs.
            <br />
            <span className="text-muted-foreground">Follow the companies.</span>
          </h1>
          <p className="text-lg text-muted-foreground max-w-md mx-auto">
            Follow companies you want to work for. The moment a matching role opens,
            you get an email — before it's everywhere else.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
            <Link href="/companies">
              <Button size="lg" variant="outline">
                Browse {companyCount} companies
                <ArrowRight className="size-4" />
              </Button>
            </Link>
            <form action={signInWithGoogle}>
              <Button size="lg" type="submit">
                Get started free
              </Button>
            </form>
          </div>
        </div>

        {/* Company logo strip */}
        <div className="mt-16 flex items-center gap-4 flex-wrap justify-center">
          <p className="text-xs text-muted-foreground w-full mb-1">Companies on Crush</p>
          {FEATURED.map((c) => (
            <div
              key={c.name}
              title={c.name}
              className="opacity-70 hover:opacity-100 transition-opacity"
            >
              <CompanyLogo name={c.name} website={c.website} size="sm" />
            </div>
          ))}
          <span className="text-xs text-muted-foreground">+ {companyCount - FEATURED.length} more</span>
        </div>
      </section>

      {/* How it works */}
      <section className="border-t">
        <div className="mx-auto max-w-5xl px-4 py-16 grid grid-cols-1 gap-8 sm:grid-cols-3">
          {[
            {
              icon: Building2,
              title: "Follow companies",
              body: "Browse our curated list and follow the companies you'd actually want to work for — not job listings.",
            },
            {
              icon: Target,
              title: "Set your criteria",
              body: "Tell us what you're looking for: role type, seniority, remote pref. We filter the noise so you don't have to.",
            },
            {
              icon: Bell,
              title: "Get notified instantly",
              body: "No daily digests, no irrelevant spam. Just one email the moment a matching role goes live.",
            },
          ].map(({ icon: Icon, title, body }) => (
            <div key={title} className="space-y-2">
              <div className="inline-flex items-center justify-center rounded-lg bg-primary/10 p-2 mb-1">
                <Icon className="size-4 text-primary" />
              </div>
              <h3 className="font-semibold text-sm">{title}</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">{body}</p>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
