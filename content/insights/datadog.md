## Getting hired at Datadog

Datadog is one of the few companies in infrastructure software where the engineering and the go-to-market are both genuinely best-in-class. That combination is rarer than it sounds, and it creates an unusual internal culture: deeply technical people who also think about adoption, instrumentation, and customer value in ways that pure research-oriented companies don't. If you've been in the observability space for any length of time, you already know the product. Getting hired there is a different question.

### What the engineering culture actually values

The mental model for Datadog engineering is production-first. They're not building tools for people who work on demo environments — they're building systems that run inside other companies' most critical infrastructure, often at the worst possible moment. This shapes how engineers there think about almost everything: reliability, backwards compatibility, performance overhead in the collection path, cardinality at scale.

The engineering culture is not particularly trendy. You won't hear much about moving fast and breaking things. What you will hear about is the cost of a broken agent rollout that touches tens of thousands of customer hosts, or the consequences of a query planner regression that makes dashboards unusable during an incident. The engineers who thrive there tend to be people who've been burned by their own decisions in production before — people who've developed instincts about what "good enough for now" actually costs you later.

Systems design interviews are heavy and specific. Expect questions about distributed tracing at real scale, about the tradeoffs in time-series storage, about how you'd design an alerting system that doesn't generate alert storms under load. Abstract systems design prep won't cut it — they want to see that you understand the problem domain specifically.

### The interview process

For senior engineers, the loop is typically four to six rounds: a recruiter screen, a technical phone screen, a coding round (usually two), a systems design round, and a behavioral/values round. The systems design round is where strong candidates differentiate themselves. They're looking for people who can talk about the real constraints of monitoring systems — cardinality explosions, high-cardinality tag abuse, query path latency, the cost of custom metrics versus logs versus traces.

The behavioral round isn't perfunctory. Datadog has developed a reasonably specific sense of what the culture looks like at a public company that's still moving quickly, and they're filtering for it. People who've only ever worked at early-stage startups sometimes underestimate this round.

For PM roles, the bar on domain knowledge is high. You should have opinions about how observability tools get adopted inside organizations — bottoms-up versus top-down, the devops persona versus the SRE persona versus the platform team persona. They care about GTM intuition alongside product sense.

### Sales and GTM culture

Datadog's go-to-market is worth understanding if you're joining in any product-adjacent or customer-facing role. This is a company that does bottoms-up developer adoption and lands-and-expands into enterprise in a highly disciplined way. The sales motion is relationship-heavy, not transactional. Account executives are not order-takers — the deal cycles in enterprise can be long and involve real technical selling.

This creates an interesting internal tension: the engineering culture is introverted and production-obsessed, while the GTM culture is polished and customer-obsessed. Senior PMs and engineers at Datadog tend to bridge this — they're comfortable talking to large enterprise customers about architecture, not just running demos.

### Where the interesting work is right now

The AI/ML observability push is real and significant. As customers instrument LLM-powered applications, the question of how you observe something that's probabilistic and latency-variable is genuinely novel. Datadog has been building tooling in this space — LLM observability, prompt tracking, cost monitoring — and the team working on it is small relative to the problem's importance. This is the area where early engineers will have the most leverage.

The other area worth watching is the cloud cost management and infrastructure efficiency space. Datadog acquired a few companies in this direction and the integration work is interesting product engineering.

### What makes candidates stand out

Strong Datadog candidates have three things: genuine depth in some part of the observability stack, good instincts about scale, and a collaborative orientation that isn't performative. They're not trying to hire brilliant assholes — the production-first culture requires that you take seriously the work other people's names are also on.

What underwhelms interviewers: candidates who've used Datadog as a customer but can't go deeper than dashboard configuration, candidates who treat the systems design round as a whiteboard exercise rather than a real technical discussion, and candidates who seem to want a prestigious logo more than a specific technical problem.

---

Datadog doesn't post roles constantly, and senior positions — especially in AI observability and platform infrastructure — move fast. Follow Datadog on Crush to get notified when roles open that match your background.
