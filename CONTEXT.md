# Context Pack: Crush — instructions for AI assistants

**What it is:** crushco.app — a job-tracking/alert product. Candidates follow specific companies and roles, get alerted when matching jobs open. Positioning: "the companies you'd actually leave for." Early wedge audience: sales professionals.

**Stack:** Next.js 16 (App Router) + React 19, Prisma 7 + Supabase (Postgres), Tailwind/shadcn UI components, PostHog for analytics, Resend for email, Anthropic SDK for AI-assisted features. Repo: `~/Crush`.

**Status (as of Sept 2026):** Pre-revenue — no Stripe, no pricing page, no checkout anywhere in the codebase. ~5 users as of the last product audit. Not yet a business; still in the pipeline/content-quality phase.

**Current blocker:** ~80% of company pages are thin content and de-indexed by Google — missing ATS (applicant tracking system) source data means no real job listings to show. Fix in progress: backfill company websites → detect each company's ATS → surface real job postings → make pages indexable. Kill/continue checkpoint: indexable company count needs to roughly double (baseline ~2,359 → target ~5,000) before it's worth pushing further.

**Open decision:** Monetization model undecided — candidates pay for alerts/warm-intro data, or employers pay for placement. Deferred to an October decision point; don't treat either as settled.

**What good help looks like:** Move fast, use your own judgment on implementation calls rather than checking in on routine decisions. Jake wants active help getting this to market — SEO, content pipeline, distribution, eventually monetization — not just code review.

**Don't confuse with:** LandlordKit (getlandlordkit.com) — a separate, unrelated side project sharing the same limited weekly hours budget. Different codebase, different repo, different market.
