# Crush GTM Strategy — May 2026

_Internal strategy doc. Not for publication._

---

## Motion: Community-Led → SEO

Two-person team, no budget, founder uncomfortable with performative marketing. Rules out paid acquisition, influencer plays, daily content grinding. The right motion is **community-led organic** short term, layering in **SEO** as content compounds.

---

## The Core Asymmetry

The advantage isn't just alerts — it's the **curation**. LinkedIn has every job. Crush has 300 companies that smart engineers actually want to work at. That's a meaningful editorial decision. All marketing should make people feel that curation. Every content piece should reinforce: *this product is for people with taste.*

---

## Channel Priority

### 1. SEO / Content — highest ROI, build first

The "Getting hired at [Company]" guides are the best asset:
- Capture high-intent search traffic ("how to get a job at Anthropic", "Stripe hiring process")
- Position Crush as a knowledgeable insider, not a job board
- Give people a reason to visit even before they're job hunting
- Build email list of exactly the right people

Start with: **Stripe, Anthropic, Linear, Vercel** — highest-intent targets because people search these companies by name.

Playbook: write the guide → publish on the company page → seed it where the audience already is → capture email signups.

### 2. Community Seeding — fast but manual

Reddit (r/ExperiencedDevs, r/cscareerquestions, r/MachineLearning) and HN. Don't post product links — answer questions well, mention Crush only when it's the honest, useful answer.

Best thread angle: "How do you track openings at specific companies you want to work at?" — this is a real question Crush answers.

HN "Show HN" when there's something worth showing — time it to a strong guide going live or a notable feature drop.

### 3. Twitter/X — secondary, good for validation

Best first post: the founding story tweet ("I manually checked 20 careers pages every week for 6 months. Then I built a thing that does it for me."). Real, specific, tells the story without pitching.

Use Twitter response to validate which angles resonate before investing more.

### 4. LinkedIn — use sparingly

Jake's filter applies: if a senior engineer at Stripe would share it because it's genuinely useful, post it. If it reads like a founder building a personal brand, skip it.

Strongest angle: "LinkedIn job alerts are broken for senior people — here's why." Ends with Crush as the logical conclusion, not the premise.

---

## 90-Day Phased Plan

### Days 1–30: Foundation

- [ ] Publish 2–3 hiring guides (Stripe + Anthropic minimum)
- [ ] Get founding story tweet live
- [ ] Answer 10–15 Reddit threads where audience asks about tracking companies or top-company job searching — no pitch, just be useful
- [ ] Run speed test (speed-test-export.ts), verify ATS timing advantage. If real → proof point. If not consistently faster → stop claiming it
- [ ] Set up basic analytics (track where signups come from)

### Days 31–60: Compound

- [ ] Publish 2 more hiring guides (Linear, Vercel)
- [ ] Post "LinkedIn alerts are broken" Twitter thread, point to blog
- [ ] One genuine Reddit post in r/ExperiencedDevs — question format, let product come up naturally
- [ ] Wire fetch-blog-signals.ts into daily cron — engineering blog signals make company pages better than any competitor

### Days 61–90: Expand

- [ ] LinkedIn post if it passes the filter (the job board observation piece)
- [ ] HN "Show HN" if product is ready for that audience
- [ ] Email sequence for users who follow companies but haven't set role criteria (not yet activated)
- [ ] Talk to 3 most-engaged users. What made them sign up? What keeps them coming back? → word-of-mouth script

---

## What Not to Do

- **Don't launch on Product Hunt yet.** Need more story + social proof. PH is a one-shot event — time it with verified speed advantage + first paid plan.
- **Don't spread across 5 channels at once.** SEO + Reddit + one tweet thread is enough for a 2-person team.
- **Don't post daily.** One great piece per week beats daily noise.
- **Don't overclaim.** "Direct ATS feed" is honest. "Real-time alerts" needs the speed test data first.

---

## The One Metric That Matters

**Weekly active watchlist users** — followed ≥1 company with role criteria set. Everything else is noise until this number grows.

---

_Next actions: Run speed test → publish Stripe/Anthropic hiring guides → founding story tweet_
