# Claude Instructions — Crush GTM Workspace

## What This Project Is
Crush is a job alert watchlist for senior tech professionals — people who aren't actively job hunting but have a shortlist of 10–20 dream companies and want to be first to know when their exact role opens. This workspace contains brand strategy, voice guidelines, and all marketing content.

## Primary Goal
Drive signups from senior tech professionals (engineers, PMs, designers, data/ML). Top-of-funnel awareness and activation — getting the right people to create an account and set up their watchlist.

## Repo Structure

| Path | Purpose | When to Read |
|---|---|---|
| `about/me.md` | Founder's personal voice, writing style, background | Before writing in the founder's voice or personalizing content |
| `strategy/brand.md` | Brand positioning, messaging, audience, competitors, voice | Before any brand copy, content, or strategy work |
| `PROGRESS.md` | Session progress log: completed, blocked, next steps, opportunities | At the start and end of every session |
| `content/ideas.md` | Running content idea backlog | When brainstorming or planning content |
| `content/calendar.md` | Publishing schedule and upcoming posts | When scheduling or checking what's next |
| `content/[platform]/drafts/` | Work-in-progress content per platform | When drafting or reviewing content |
| `content/[platform]/published/` | Final published content archive | When checking what's been posted or repurposing |
| `assets/` | Logos, brand files, visual references | When creating visual content or referencing brand assets |

## Content Naming Convention

```
YYYY-MM-DD_short-topic-slug.md
```

Examples:
- `2026-05-30_why-job-boards-are-broken.md`
- `2026-06-01_getting-hired-at-stripe.md`

## Content Workflow

1. **Idea** → add a line to `content/ideas.md`
2. **Draft** → create file in `content/[platform]/drafts/` using naming convention above
3. **Publish** → move file from `drafts/` to `published/`
4. **Repurpose** → create a new draft in the target platform's `drafts/` folder, referencing the original

## How to Draft Content

- Always read `strategy/brand.md` before writing brand or marketing content
- Always read `about/me.md` before writing in the founder's voice
- Match the warm, practical, insider tone defined in those files — not corporate, not hype
- LinkedIn posts: founder is uncomfortable putting his name to content that feels performative; keep it grounded and peer-to-peer
- Follow the naming convention and save to the correct platform folder
- Never dump content into root or strategy files

## How to Update Files

Route new learnings to the right file:

- Brand shifts, new messaging, audience insights → `strategy/brand.md`
- Voice discoveries, writing preferences, pet peeves → `about/me.md`
- New content ideas → `content/ideas.md`
- Session outcomes, blocked tasks, next steps → `PROGRESS.md`

## Progress Tracking

Always update `PROGRESS.md` in every work session.

## Active Channels
- Twitter/X (primary social)
- SEO / content (company pages, hiring guides, blog)
- Community (Reddit, Hacker News, Indie Hackers)
- LinkedIn (active but founder-reluctant — needs to feel natural, not performative)
- Email (alerts + future nurture)

## Tools & Platforms
- Product: Next.js, Supabase, Vercel
- Analytics: to be set up
- Email: to be set up
- CRM: not yet in use

## Team Workflow
Two co-founders split marketing. No formal approval process — publish when it feels right. Claude supports drafting, strategy, and ideation across all channels.

## Constraints
- Founder is uncomfortable with LinkedIn content that feels like personal branding — keep it peer-to-peer, not self-promotional
- No monetization yet — don't position as a paid product
- ATS feed access has no contractual protection — avoid overclaiming "real-time" in a way that creates legal exposure
- Small team — prefer high-leverage, low-maintenance channels over anything requiring daily attention

## Success Metrics
- **90-day primary goal:** Meaningful active users checking matches weekly
- Secondary: Email open rate on alerts >40%, weekly signups trending up

## Operating Principles
- Read `strategy/brand.md` before writing brand copy or strategy
- Read `about/me.md` before writing in the founder's voice
- Use `content/ideas.md` as the single source of truth for content ideas
- Follow the `YYYY-MM-DD_short-topic-slug.md` naming convention
- Save all drafts to `content/[platform]/drafts/`
- Move published content to `content/[platform]/published/`
- Place brand assets in `assets/`
- Update `PROGRESS.md` in every session
- When writing LinkedIn content, check: "Would a senior engineer share this, or does it feel like a startup pitch?" If the latter, rewrite.
