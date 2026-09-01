# GTM-AUG-2026 — Crush's four-week track

**Window:** Mon 2026-08-03 → Sun 2026-08-30
**Jake's budget: ~6 hours total** (~1.5/week), review and judgment only.
**This is not a go-to-market sprint.** It is a data-pipeline repair.

---

## Why Crush is not getting a GTM sprint this month

Three facts, decided 2026-08-03:

1. **There is no monetization surface.** No Stripe dependency, no `/pricing`
   route, no checkout anywhere in `src/app`. Crush cannot currently become a
   business, so "bring it to market" has nothing to point at. Decision this
   month: grow users, defer revenue.

2. **The bottleneck is supply, not demand.** Search Console on 2026-07-31:
   **5,830 pages indexed, 36.7K impressions, 9 clicks, 0% CTR.** Crush already
   ranks (avg position 10.8). It gives searchers no reason to click, because
   **9,208 of 11,567 companies (80%) are thin** — no jobs, no description, no
   guide. Marketing a site with 80% empty pages wastes the marketing.

3. **The chosen channels don't reach job seekers.** Jake will front landlord
   forums and HARO/press. Neither reaches Crush's audience, and he ruled out
   LinkedIn and cold email for this window.

So Crush's August is spent making the pages worth clicking. Distribution is a
Q4 question.

---

## The causal chain (this is the whole plan)

```
10,218 companies are sourceType=manual
   └─ 9,079 of those have NO website set
        └─ detectAts() derives board-token candidates from name + website domain
             └─ no website ⇒ no ATS source ⇒ no jobs ingested
                  └─ no jobs + no guide + no description
                       └─ noindexed by (browse)/companies/[slug]/page.tsx:49
                            └─ excluded from sitemap.ts (same filter)
```

Fix the top of the chain and pages become indexable automatically. The
noindex rule is *correct* — do not weaken it.

**Order matters:** `scripts/backfill-websites.ts` → `scripts/detect-ats-manual.ts`.
Running detection before backfill does nothing.

---

## Week-by-week

### Week 1 (Aug 3–9) — Backfill websites — *Jake: 1.5 hrs*

Agent runs `scripts/backfill-websites.ts` across the 9,079 website-less
companies. **Jake reviews a sample of ~30 resolved domains before commit.**

That review is the real work: a wrong domain produces a wrong board-token
candidate, which either detects nothing or — worse — attaches another company's
job board. Garbage in at this step poisons everything downstream.

### Week 2 (Aug 10–16) — Detect ATS sources — *Jake: 1.5 hrs*

Agent runs `scripts/detect-ats-manual.ts` **dry-run first**, Jake eyeballs the
diff, then live.

> ⚠ **Watch the alert blast.** The first-ingest guard from PR #3 treats a
> newly-sourced company's backlog as backfill and suppresses alerts. It behaved
> correctly on the 277-job sales-collection ingest (0 emails). Verify it holds
> at this much larger scale **before** going live, or you email-bomb every user
> who follows a newly-sourced company.

Also: `detectAts()` derives slugs from name + domain only, so it misses
companies whose board token differs from their name (HubSpot → `hubspotjobs`,
Gong → `gongio`, Apollo.io → `apolloio`). Probe likely suffixes by hand for any
well-known company that comes back empty.

### Week 3 (Aug 17–23) — Measure and resubmit — *Jake: 1.5 hrs*

- Count indexable companies against the **2,359 baseline**.
- Regenerate and resubmit the sitemap (currently 2,378 URLs, down from the
  ~11.5k originally submitted — that drop was correct, not a regression).
- Chase the four known-unsourced companies: Seismic, Clari, Monday.com
  (hand-probe tokens) and **Zendesk**, which is on Workday — `workday` exists in
  the `CompanySource` enum but **has no fetcher in `src/lib/ingestion/`**.
  Writing one is a separate call; note it, don't scope-creep into it.
- Also dead: Rippling's `greenhouse/rippling` token (they dogfood their own ATS).

### Week 4 (Aug 24–30) — Honest scorecard — *Jake: 1.5 hrs*

Record the numbers. Judge against the kill criterion. Decide whether Crush gets
Q4 attention and, if so, answer the monetization question.

---

## Set expectations now

**Crush will not show user growth by Aug 30.** Indexing and ranking lag 4–12
weeks; pages that become indexable in Week 2 are a Q4 traffic event. Judging
this track on August traffic will produce the wrong conclusion.

The August win is a **supply** number, not a demand number.

| Metric | Baseline | Aug 30 target |
|---|---|---|
| Companies with a `website` | 2,488 of 11,567 | 8,000+ |
| Companies with an ATS source | 1,349 | meaningful increase |
| Companies with active jobs | 1,176 | meaningful increase |
| **Indexable companies** | **2,359** | **~5,000 (roughly double)** |
| Sitemap URLs | 2,378 | grows with the above |

---

## Kill criterion — judge on 2026-08-30

**Continue Crush into Q4 if indexable companies roughly doubled.**

If the backfill + detect pipeline does *not* move that number, the thin-page
problem is not fixable with scripts, and Crush needs a different content
strategy entirely — most likely the `scripts/generate-insight.ts` guide pipeline
(deferred 2026-07-07 pending traffic/ROI; ~$0.50–1/guide on the metered
Anthropic API, and prompt caching + the Batch API would cut a batch run from
~$30–50 to ~$10–20).

---

## Deferred to Q4, deliberately

| Item | Why deferred |
|---|---|
| **Monetization decision** | Not an August problem, but put it on the October calendar. Every month of SEO work compounds into an asset with no capture mechanism. Options: candidates pay for alerts + warm-intro data, or employers pay for placement / featured pages. |
| Distribution / launch | Pointless while 80% of pages are empty. Revisit once the supply numbers land. |
| `generate-insight.ts` guide pipeline | Costs real money; gate it on the traffic this repair produces. |
| Workday fetcher | Unlocks Zendesk and others, but it's a build, not a fix. |
| Duplicate Vercel projects `crush`, `crush-fkcl` | Both rebuild the same repo on every push. Housekeeping; delete when convenient. |

---

## Related

LandlordKit is the primary bet this month and carries ~20 of the 26 available
hours — see `~/landlordkit/GTM-AUG-2026.md`.
