import { redirect } from "next/navigation";
import Link from "next/link";
import { ArrowRight, Bell, Building2, Filter } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { Button } from "@/components/ui/button";
import { CompanyLogo } from "@/components/company-logo";
import { signInWithGoogle } from "@/app/actions/auth";
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
    icon: Building2,
    title: "Your list, not a job board",
    body: "Browse a curated set of VC-backed companies and follow the ones you'd actually leave for. Not a feed of thousands — a focused watchlist you control.",
  },
  {
    icon: Filter,
    title: "Set your exact criteria",
    body: "Define your role, seniority, and location — like \"Senior Engineer, Remote, Series B+\". We match every new opening against your spec, not a keyword cloud.",
  },
  {
    icon: Bell,
    title: "One alert. Zero noise.",
    body: "When your exact match opens at a company you follow, you get one email. No daily digests, no sponsored posts, no irrelevant listings. Just the signal.",
  },
];

const TESTIMONIALS = [
  {
    quote: "I had 15 companies I'd actually consider. Checking each one's careers page every week was exhausting. Crush does it for me.",
    name: "Senior Engineer",
    context: "Previously at a FAANG, watching frontier AI labs",
  },
  {
    quote: "I'm not job hunting — but I know exactly where I'd go if the right role opened. Crush is the only thing that would actually tell me.",
    name: "Product Manager",
    context: "Passively watching 12 growth-stage companies",
  },
];

export default async function HomePage({
  searchParams,
}: {
  searchParams: Promise<{ code?: string }>;
}) {
  const { code } = await searchParams;
  if (code) {
    redirect(`/api/auth/callback?code=${code}`);
  }

  const supabase = await createClient();
  const { data: { user: authUser } } = await supabase.auth.getUser();

  if (authUser) redirect("/dashboard");

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
                Get started free →
              </Button>
            </form>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="flex-1 flex flex-col items-center justify-center px-4 py-24 text-center">
        <div className="max-w-3xl space-y-7">
          <div className="inline-flex items-center gap-2 rounded-full border border-border bg-muted/60 px-3 py-1 text-xs text-muted-foreground">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
            Not every company. The ones worth watching.
          </div>

          <h1 className="font-heading text-5xl font-bold tracking-tight leading-[1.08] sm:text-6xl lg:text-[4.5rem]">
            The companies
            <br />
            you&apos;d actually
            <br />
            <span className="italic">leave for.</span>
          </h1>

          <p className="text-lg text-muted-foreground max-w-md mx-auto leading-relaxed">
            You&apos;re not job hunting. But you have a shortlist. Crush watches those companies every day and sends one targeted alert the moment your exact role opens up.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
            <form action={signInWithGoogle}>
              <Button size="lg" type="submit" className="gap-2 px-8">
                Start tracking for free
                <ArrowRight className="size-4" />
              </Button>
            </form>
            <Link href="/companies">
              <Button size="lg" variant="outline" className="px-8">
                Browse companies
              </Button>
            </Link>
          </div>

          {/* Company logo strip */}
          <div className="pt-4 space-y-3">
            <p className="text-xs text-muted-foreground uppercase tracking-widest font-medium">
              A few of the companies on Crush
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
            </div>
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="border-t bg-card">
        <div className="mx-auto max-w-5xl px-4 py-20">
          <div className="mb-12 space-y-2">
            <h2 className="font-heading text-3xl font-bold">How it works</h2>
            <p className="text-muted-foreground text-sm max-w-md">
              Three steps. Set it once. Let Crush do the daily checking you&apos;ve been doing manually.
            </p>
          </div>
          <div className="grid grid-cols-1 gap-10 sm:grid-cols-3">
            {FEATURES.map(({ icon: Icon, title, body }, i) => (
              <div key={title} className="space-y-3">
                <div className="flex items-center gap-3">
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg border bg-background">
                    <Icon className="size-3.5 text-muted-foreground" />
                  </div>
                  <span className="text-xs font-medium text-muted-foreground">Step {i + 1}</span>
                </div>
                <h3 className="font-heading font-bold text-base">{title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Social proof */}
      <section className="border-t">
        <div className="mx-auto max-w-5xl px-4 py-20">
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
            {TESTIMONIALS.map((t) => (
              <div key={t.name} className="rounded-xl border bg-card p-6 space-y-4">
                <p className="text-sm leading-relaxed text-foreground">
                  &ldquo;{t.quote}&rdquo;
                </p>
                <div>
                  <p className="text-xs font-semibold">{t.name}</p>
                  <p className="text-xs text-muted-foreground">{t.context}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Positioning */}
      <section className="border-t bg-card">
        <div className="mx-auto max-w-3xl px-4 py-24 space-y-6">
          <h2 className="font-heading text-4xl font-bold leading-tight">
            Not a job board.
            <br />
            A watchlist.
          </h2>
          <div className="space-y-3 text-muted-foreground leading-relaxed max-w-xl">
            <p>
              LinkedIn shows you everything. Indeed shows you everything. That&apos;s the problem.
            </p>
            <p>
              Crush shows you exactly one thing: when a company you care about posts a role you&apos;d actually apply for. Nothing more.
            </p>
            <p>
              Every company on Crush was added because someone smart would want to work there. Not because they have a job board budget. The curation is the product.
            </p>
          </div>
          <form action={signInWithGoogle}>
            <Button size="lg" type="submit" className="gap-2 mt-2">
              Build your watchlist
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
