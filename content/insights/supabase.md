## Getting hired at Supabase

Supabase has a smaller team than most people realize. The product is used by hundreds of thousands of developers, the GitHub repository is one of the most-starred in the backend space, and the brand recognition in developer communities is outsized — and yet the company operates with a headcount that would surprise people who assume scale of impact implies scale of organization. That's the core thing to understand about Supabase before you consider applying: every hire is genuinely load-bearing.

### What "Postgres-first" actually means for how they hire

The Firebase alternative positioning is accurate but undersells the technical specificity. Supabase is betting that Postgres is the right foundation for almost everything — authentication, storage, realtime, edge functions — and that the developer experience layer on top of Postgres is what's been missing. This means the engineering team needs deep knowledge of how Postgres actually works: row-level security, logical replication, extensions, the query planner, connection pooling.

Engineers who treat Postgres as a commodity — a thing that stores data — tend not to do well in Supabase interviews. Engineers who get excited about pg_repack, or who have opinions about PgBouncer versus PgCat, or who've debugged connection pool exhaustion at 3am, are speaking the right language. The same applies to engineers joining in adjacent areas: you don't need to be a Postgres expert to work on the edge runtime or the realtime subscriptions layer, but you need to understand the architectural decision that Postgres is the backbone.

### The open source signal matters more here than anywhere

Supabase's entire GTM depends on developers trusting the product before they ever talk to a salesperson. The OSS repositories are the product, the marketing, and the hiring filter simultaneously. When the team looks at candidates, GitHub contribution history — to Supabase or to related projects — carries real weight. Not as a bureaucratic checkbox, but because it tells you whether someone has shipped in public, received community feedback, and cared about the developer experience of people they've never met.

This doesn't mean you have to be a core contributor. It means you should have a posture toward public contribution that isn't transactional. People who've opened issues with good reproductions, written detailed pull request descriptions, or engaged thoughtfully with community feedback on their work tend to stand out.

### Why they hire slowly and what they're actually filtering for

Supabase is explicit about hiring slowly. When a team is this small, a bad hire is expensive in ways that compound fast. The filter isn't primarily about credentials or years of experience — it's about whether you can operate with high autonomy, low oversight, and a strong instinct for what matters.

The practical translation: they want people who can identify a problem, determine whether it's worth solving, design a solution, build it, ship it, and think about how developers will experience it — without a manager telling them what to do at each step. Engineers who need a clear sprint backlog, well-defined requirements, and consistent code review before making decisions tend to be uncomfortable there. Engineers who find that amount of autonomy energizing tend to love it.

The interviews test this directly. There will be ambiguous problems where there's no single right answer, and the interviewers are watching whether you make decisions with conviction, explain your reasoning clearly, and update when given new information.

### Developer experience as a first-order concern

Supabase's stated mission is to make Postgres accessible to developers who might otherwise use a managed NoSQL product. Developer experience isn't a product team concern — it's something every engineer is expected to care about. This means thinking about API ergonomics, documentation, error messages, and the progressive disclosure of complexity.

If you've shipped a developer tool or an API used externally, that background reads well. If you have opinions about why certain developer experiences succeed or fail, and you can articulate those opinions with specific examples, that reads even better.

### The remote-first reality

Supabase is globally distributed in a meaningful way — team members span Europe, Asia-Pacific, and the Americas. The async communication culture is mature. The thing that makes it work is that people are highly self-directed and write well. If your communication style relies heavily on verbal explanation, synchronous clarification, and ambient context from being in the same office, the adjustment is real.

What works there: people who write long, thoughtful documents before making decisions; people who over-communicate their reasoning asynchronously; people who treat code, pull requests, and commit messages as primary communication channels rather than afterthoughts.

---

Supabase opens roles infrequently. When they do, the roles are usually specific and the process is fast. Follow Supabase on Crush to get notified the moment a role opens that matches your background.
