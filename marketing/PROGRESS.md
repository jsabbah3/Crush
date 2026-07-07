# Progress

_Update this file at the end of every session._

## Completed Tasks
- [2026-07-06] UI/UX refinement pass across landing, browse, dashboard, onboarding. Landing hero now uses the brand headline ("The companies you'd actually leave for."). Industry taxonomy normalized in DB (55 → 23 values) so browse filters no longer show duplicates. Instant search on browse. Pre-marketing-push polish.
- [2026-07-06] Built insight-generation pipeline (`scripts/generate-insight.ts`): Claude Opus + web search drafts "Getting hired at [Company]" guides in brand voice, grounded in DB data (active roles, funding, blog signals). Drafts go to `insights/drafts/` for review; `--publish` pushes to company pages. First draft generated: Exa. Scales the SEO motion from 29 hand-written guides toward 300.
- [2026-05-30] Bootstrapped GTM workspace. Brand, voice, and channel strategy documented.
- [2026-05-30] GTM strategy defined: community-led → SEO motion. Channel priority set (SEO first, Reddit/community second, Twitter third, LinkedIn sparingly). 90-day phased plan documented in `content/blog/drafts/2026-05-30_gtm-strategy.md`.

## Blocked Tasks
- LinkedIn content: founder uncomfortable with personal-brand-style posts — need a tone/format that feels natural before publishing anything
- Speed advantage claim: unverified — need to run speed-test-export.ts and measure actual Crush vs. LinkedIn lag before using "faster than LinkedIn" in copy
- ATS partnerships: no outreach done yet to Greenhouse/Lever — limits how aggressively we can position the data source

## Next Steps
- [ ] Write first Twitter/X post (low stakes, good first channel to test voice)
- [ ] Write first Reddit post for r/cscareerquestions or r/ExperiencedDevs introducing Crush
- [ ] Write one "Getting hired at [Company]" insider guide (Stripe or Anthropic are good starts)
- [ ] Draft outreach email to Greenhouse/Lever partnership contacts
- [ ] Run speed test CSV and measure actual Crush vs. LinkedIn time delta

## Future Opportunities
- SEO: company pages could rank for "[Company] hiring", "[Company] open roles", "[Company] engineering jobs" — high-intent, low-competition keywords
- Product Hunt launch — once user base is stronger and product is more polished
- "Crush Insiders" community angle — people who've worked at these companies sharing hiring intel
- Engineering blog integration is live — could become a unique content hook ("what [Company]'s engineering team is working on right now")
- Email nurture sequence for users who sign up but don't activate (don't follow companies or add roles)
