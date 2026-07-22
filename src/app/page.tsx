import { redirect } from "next/navigation";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { Button } from "@/components/ui/button";
import { CompanyLogo } from "@/components/company-logo";
import { LandingHeroMock } from "@/components/landing-hero-mock";
import { ThemeToggleButton } from "@/components/theme-toggle";
import { signInWithGoogle } from "@/app/actions/auth";


const FEATURES = [
  {
    step: "01",
    title: "Build your watchlist",
    body: "Browse a curated set of VC-backed companies and follow the ones you actually want to work at. Not a feed of thousands — a focused watchlist you control.",
  },
  {
    step: "02",
    title: "Set your exact criteria",
    body: "Define your role, seniority, and location. We match every new opening against your spec, not a keyword cloud.",
  },
  {
    step: "03",
    title: "One alert. Zero noise.",
    body: "When your exact match opens at a company you follow, you get one email. No daily digests, no sponsored posts. Just the signal.",
  },
];

const TESTIMONIALS = [
  {
    quote: "I had 15 companies I'd actually consider. Checking each one's careers page every week was exhausting. Crush does it for me.",
    name: "Senior Engineer",
    context: "Watching frontier AI labs",
  },
  {
    quote: "I'm not job hunting — but I know exactly where I'd go if the right role opened. Crush is the only thing that would actually tell me.",
    name: "Product Manager",
    context: "Watching 12 growth-stage companies",
  },
];

export default async function HomePage({
  searchParams,
}: {
  searchParams: Promise<{ code?: string }>;
}) {
  const { code } = await searchParams;
  if (code) redirect(`/api/auth/callback?code=${code}`);

  const supabase = await createClient();
  const { data: { user: authUser } } = await supabase.auth.getUser();
  if (authUser) redirect("/dashboard");

  const [recentlyFunded, companyCount] = await Promise.all([
    prisma.company.findMany({
      where: { recentlyFundedAt: { not: null } },
      orderBy: { recentlyFundedAt: "desc" },
      take: 6,
      select: { name: true, website: true, slug: true, fundingStage: true, recentlyFundedAt: true },
    }).catch(() => []),
    prisma.company.count().catch(() => 0),
  ]);
  const roundedCount = companyCount >= 100
    ? `${(Math.floor(companyCount / 100) * 100).toLocaleString("en-US")}+`
    : null;

  function fundingLabel(stage: string | null): string {
    const map: Record<string, string> = {
      seed: "Seed", series_a: "Series A", series_b: "Series B",
      series_c: "Series C", growth: "Growth", public: "Public",
    };
    return stage ? (map[stage] ?? stage) : "Funded";
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">

      {/* Nav */}
      <header className="sticky top-0 z-10 bg-background/95 backdrop-blur border-b border-border/50">
        <div className="mx-auto max-w-6xl flex items-center justify-between px-6 h-14">
          <span className="font-heading font-bold text-base tracking-tight">Crush</span>
          <nav className="hidden sm:flex items-center gap-6">
            <Link href="/companies" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
              Browse
            </Link>
            <Link href="/blog" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
              Blog
            </Link>
          </nav>
          <div className="flex items-center gap-2">
            <ThemeToggleButton className="hidden sm:inline-flex" />
            <form action={signInWithGoogle}>
              <Button variant="ghost" size="sm" type="submit" className="text-sm font-normal text-muted-foreground hover:text-foreground">
                Log in
              </Button>
            </form>
            <form action={signInWithGoogle}>
              <Button variant="ink" size="sm" type="submit" className="text-sm px-4">
                Sign up
              </Button>
            </form>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="flex-1 mx-auto max-w-6xl w-full px-6 py-20 lg:py-28">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">

          {/* Left — text */}
          <div className="space-y-8">
            <div className="inline-flex items-center gap-2 text-xs text-muted-foreground">
              <span className="relative flex h-1.5 w-1.5">
                <span className="absolute inline-flex h-full w-full rounded-full bg-moss opacity-70 motion-safe:animate-ping" />
                <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-moss" />
              </span>
              {roundedCount ? `${roundedCount} companies on Crush · updated weekly` : "Updated weekly with newly funded companies"}
            </div>

            <div>
              <h1 className="font-heading font-bold tracking-tight leading-[1.08] text-[2.75rem] sm:text-[3.5rem] lg:text-[3.9rem] text-balance">
                <span className="text-foreground">The companies you&apos;d </span>
                <span className="text-primary italic">actually leave for.</span>
              </h1>
            </div>

            <p className="text-lg text-muted-foreground leading-relaxed max-w-md">
              Follow your company crushes. We&apos;ll tell you when they&apos;re ready for you.
            </p>

            <div className="flex flex-col sm:flex-row gap-3">
              <form action={signInWithGoogle} className="w-full sm:w-auto">
                <Button variant="ink" size="lg" type="submit" className="gap-2 w-full sm:w-auto">
                  Start tracking free
                  <ArrowRight className="size-4" />
                </Button>
              </form>
              <Link href="/companies" className="w-full sm:w-auto">
                <Button size="lg" variant="outline" className="w-full sm:w-auto border-border/60">
                  Browse companies
                </Button>
              </Link>
            </div>

            {/* Recently funded strip */}
            {recentlyFunded.length > 0 && (
              <div className="pt-2 space-y-3">
                <p className="font-mono text-[11px] text-muted-foreground/70 uppercase tracking-widest font-medium flex items-center gap-1.5">
                  <span className="h-1.5 w-1.5 rounded-full bg-moss" />
                  Recently added to Crush
                </p>
                <div className="flex flex-wrap gap-2">
                  {recentlyFunded.map((c) => (
                    <Link
                      key={c.slug}
                      href={`/companies/${c.slug}`}
                      className="flex items-center gap-2 rounded-lg border border-border/50 bg-muted/30 px-3 py-1.5 transition-[border-color,background-color] duration-[var(--dur-fast)] hover:border-border hover:bg-muted/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/60"
                    >
                      <CompanyLogo name={c.name} website={c.website} size="sm" className="size-5 rounded-md" />
                      <span className="text-xs font-medium">{c.name}</span>
                      <span className="text-[11px] text-moss font-medium">{fundingLabel(c.fundingStage)}</span>
                    </Link>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Right — product mockup (animated match arrival) */}
          <div className="hidden lg:block">
            <LandingHeroMock />
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="border-t border-border/50">
        <div className="mx-auto max-w-6xl px-6 py-20">
          <div className="grid grid-cols-1 gap-12 sm:grid-cols-3">
            {FEATURES.map(({ step, title, body }) => (
              <div key={title} className="space-y-4">
                <span className="text-xs font-mono text-muted-foreground/50">{step}</span>
                <h3 className="font-heading font-bold text-lg">{title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section className="border-t border-border/50">
        <div className="mx-auto max-w-6xl px-6 py-20">
          <div className="grid grid-cols-1 gap-8 sm:grid-cols-2">
            {TESTIMONIALS.map((t) => (
              <figure key={t.name} className="space-y-5 border-l-2 border-primary/30 pl-6">
                <blockquote className="text-lg leading-relaxed text-foreground font-heading">
                  &ldquo;{t.quote}&rdquo;
                </blockquote>
                <figcaption>
                  <p className="text-sm font-semibold">{t.name}</p>
                  <p className="text-sm text-muted-foreground">{t.context}</p>
                </figcaption>
              </figure>
            ))}
          </div>
        </div>
      </section>

      {/* Positioning — contrast band. Dramatic dark ink in light theme; an
          elevated warm-ink panel in dark theme (so it doesn't invert to a
          jarring light block). */}
      <section className="border-t border-border bg-ink-band text-ink-band-foreground">
        <div className="mx-auto max-w-6xl px-6 py-24">
          <div className="max-w-xl space-y-6">
            <h2 className="font-heading text-4xl font-bold leading-tight sm:text-5xl tracking-tight text-balance">
              Not a job board.
              <br />
              <span className="text-primary italic">A watchlist.</span>
            </h2>
            <div className="space-y-3 text-sm leading-relaxed text-ink-band-foreground/70 max-w-[52ch]">
              <p>LinkedIn shows you everything. Indeed shows you everything. That&apos;s the problem.</p>
              <p>Crush shows you exactly one thing: when a company you care about posts a role you&apos;d actually apply for.</p>
              <p>Every company on Crush was added because someone smart would want to work there. The curation is the product.</p>
            </div>
            <form action={signInWithGoogle}>
              <Button size="lg" type="submit" className="gap-2 bg-primary text-primary-foreground hover:bg-primary/90">
                Build your watchlist
                <ArrowRight className="size-4" />
              </Button>
            </form>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border/50 py-6">
        <div className="mx-auto max-w-6xl px-6 flex items-center justify-between">
          <span className="font-heading font-bold text-sm">Crush</span>
          <div className="flex items-center gap-6">
            <Link href="/blog" className="text-xs text-muted-foreground hover:text-foreground transition-colors rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/60">
              Blog
            </Link>
            <Link href="/companies" className="text-xs text-muted-foreground hover:text-foreground transition-colors rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/60">
              Browse
            </Link>
            <span className="text-xs text-muted-foreground/50">
              © {new Date().getFullYear()} Crush
            </span>
          </div>
        </div>
      </footer>

    </div>
  );
}
