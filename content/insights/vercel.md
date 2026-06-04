## Getting hired at Vercel

Vercel is a small company with outsized cultural influence in the developer ecosystem. They've shipped Next.js to millions of developers, defined what modern frontend deployment looks like, and attracted a genuinely elite engineering team. The bar is high, the team is small, and the filter is specific. Understanding what they're actually selecting for makes the difference between a strong application and a generic one.

## Developer empathy as the real filter

Every company says they care about developer experience. Vercel is one of the few where this is actually the primary evaluation criterion, not a checkbox on a list of values.

What developer empathy means at Vercel, specifically: you've used the product as a developer and have genuine opinions about what works and what doesn't. You've thought about the friction in your own development workflow not as "I should file a bug report" but as "why is this hard, and what would make it not hard?" You can look at an API surface and immediately feel which parts are awkward without having to read the documentation.

This shows up in interviews in predictable ways. Vercel engineers will ask about things you've built and what you found frustrating about the tools you used to build them. Candidates who describe their past work in terms of features shipped and metrics improved — without any texture about the craftsmanship layer — tend to not connect well with Vercel interviewers. The ones who do connect usually have something specific and articulate to say about a time they cared about the quality of an experience for other developers, not just the user.

If you're prepping: spend time with the actual Vercel product before your interviews. Not surface-level. Deep enough that you have genuine opinions about the deployment experience, the edge runtime, the way rollbacks work. Come with a perspective.

## The infra/product intersection

Vercel sits at an unusual place technically. The engineering work involves serious infrastructure — edge networks, CDN behavior, build systems, serverless execution models, cache invalidation at scale — but the surface it exposes to users is a product with strong opinions about simplicity.

This means the best Vercel engineers tend to be people who can hold both modes simultaneously. They can reason carefully about distributed systems behavior and also care deeply about whether the error message a developer sees at 11pm when their deploy fails actually tells them what they need to know.

People who are purely infra-focused — great distributed systems engineers with no interest in product thinking — tend to be a weaker fit. People who are purely product-focused — great at UX and user research but not deeply technical — also tend to be a weaker fit. The intersection is the point.

If your background is primarily one or the other, it helps to be able to demonstrate genuine interest in the other side. Not faked interest — actual things you've read, built, or thought carefully about.

## What "shipping" means at Vercel's pace

Vercel moves fast in the specific way that companies with strong technical leadership and opinionated product direction move fast: not chaotic-startup fast, but deliberate-and-high-throughput fast.

The people who thrive there are comfortable with decisions being made and moving on, rather than processes that require multi-stakeholder buy-in before anything ships. There's real autonomy at the individual contributor level — you're expected to own your surface area, make calls, and be accountable for the outcome.

The flip side is that ambiguity tolerance matters a lot. Projects don't always come with detailed specs. You're often working at the boundary of "here's the rough shape of what we want, figure out the best way to get there." Candidates who need heavy process to do their best work consistently describe Vercel as a difficult fit.

## The DX obsession and what it actually demands

Vercel's developer experience focus isn't just a marketing angle — it shapes how the engineering team evaluates its own work. The standard for a feature being "done" includes whether it's understandable, whether the defaults are sensible, and whether the error surfaces are useful. This is baked into how they do code review.

Practically, this means the engineering role at Vercel is more writing-intensive than a typical infrastructure company. Documentation matters. How you name things matters. The structure of configuration files matters. If you're someone who thinks documentation is someone else's job, or who uses variable names that only make sense to you, you'll have friction in their process.

The quality bar extends to aesthetic considerations in a way that's unusual for infra companies. Vercel ships beautiful things — their dashboard, their error pages, their onboarding flows. That aesthetic care is reflected in how the team evaluates work internally.

## Roles they hire most

The engineering team is small enough that openings don't come frequently. When they do, they tend to cluster around:

**Runtime and infrastructure engineering** — the core execution environment, edge network behavior, build systems. This is where the deepest distributed systems work lives.

**Framework engineering** — primarily Next.js, but also the intersection of frameworks with the platform. People with strong OSS backgrounds and opinions about React's future are particularly interesting to them.

**Developer tooling and CLI** — the local development experience, the deployment CLI, the integrations with editors and CI/CD systems.

**Platform product engineering** — the dashboard, the team management features, the analytics surfaces. More product-adjacent than the infra roles, but still requires deep technical credibility.

Product management and design roles open occasionally and tend to be filled quickly because the team is small and each seat matters enormously to the culture.

## Approaching Vercel cold

If you don't have a warm intro — and most people don't — the most effective cold approach is through demonstrated work. Contributing to Next.js is the obvious path if you're an engineer, but it's also the most competitive. More distinctive: build something interesting with Vercel's platform and write about it in a way that reveals your thinking. Not a tutorial. An analysis — here's what worked, here's what surprised me, here's what I'd want to improve.

The people at Vercel who evaluate candidates do read things. The developer ecosystem is small enough that good writing by thoughtful engineers circulates. It's not guaranteed, but it's a much better use of effort than sending a cold LinkedIn message.

When you do reach out or apply, be specific about what you want to work on and why. "I want to work on hard problems at a fast-moving company" is meaningless at Vercel. "I've been thinking about cold start latency in edge functions and have thoughts about how the execution model could be improved" is the kind of thing that gets a response.

---

Vercel's team is small enough that roles are genuinely rare. Follow Vercel on Crush and we'll notify you the moment something worth your attention opens — before it makes the rounds on social and the inbound spike starts.
