## Getting hired at Discord

Discord has a infrastructure problem that sounds simple and is not: deliver messages instantly, reliably, to hundreds of millions of users, in real-time, across channels that range from two-person DMs to server rooms with hundreds of thousands of concurrent members. The company has been building and rebuilding the systems that make this work since 2015, and the engineering culture that resulted is serious about performance in a way that you don't find at many product companies.

### The scale of the real-time problem

Most messaging infrastructure at scale solves the fan-out problem statically — messages go to users when they're delivered. Discord's problem is that users can be in many servers simultaneously, servers can have thousands of channels, and the presence system (who's online, who's in a voice call, what's their status) has to propagate in near-real-time across all of it. The scale of presence events alone exceeds what most companies' entire message buses handle.

The infrastructure engineers who've built this are genuinely proud of the work, and they should be. The Read States service, which tracks which messages each user has seen across every channel they have access to, is one of the more technically interesting systems in production anywhere. Discord has written publicly about some of this work, and reading those engineering blog posts before interviewing for an infrastructure role is not optional — they're a test of whether you can engage with the actual technical challenges.

### Rust adoption as a signal

Discord's adoption of Rust — they rewrote hot paths from Go and are building new systems in Rust — isn't a trend-chasing decision. It came from real production problems: GC pauses in Go causing latency spikes in latency-sensitive systems, memory footprint constraints in services running on millions of connections simultaneously. The decision to use Rust where it matters is a signal about the engineering culture: they make technically principled decisions and are willing to take short-term velocity hits to get the long-term performance and safety properties they need.

For engineers applying to infrastructure roles, having Rust experience is genuinely useful. Not mandatory everywhere — there's plenty of Go, Python, and TypeScript in the stack — but Rust experience signals that you're the kind of engineer who chooses tools based on properties rather than familiarity.

### The shift from gaming to general community platform

Discord's early identity was gaming. The design sensibility (the dark purple, the game controller icon), the feature set (voice channels, role systems, bot ecosystem), the initial community — all gaming-native. The broader platform ambition has brought in education communities, creator communities, brand servers, DAOs, and general purpose group messaging. This expansion creates interesting product problems but also internal tension about what Discord actually is and who it's for.

For engineers and PMs, understanding this tension is important. Some of the product decisions that seem inconsistent from the outside make more sense when you understand the dual constituency: the original gaming-native power users who have strong opinions about any change, and the broader audience that Discord needs to grow. Senior product hires are evaluated on whether they can navigate this complexity rather than pretend it doesn't exist.

### The interview process

The engineering interview loop is typically five to six rounds for senior candidates: a recruiter screen, technical phone screen, one or two coding rounds, a systems design round, and a behavioral round. The systems design round for infrastructure roles will probe distributed systems depth directly — expect questions about consistency models, fan-out architectures, cache invalidation strategies, and how you'd approach a migration of a live production system.

For the coding rounds, Discord tends toward practical problems rather than pure algorithm exercises. They care about whether you can write production-quality code — error handling, testing considerations, clean interfaces — rather than just whether you can arrive at a correct solution.

The behavioral round at Discord tends to probe for both technical judgment and collaboration patterns. The culture has a direct communication style; people there say what they think. Candidates who hedge everything or can't commit to a technical position under gentle pressure tend not to land well.

### Where the interesting work is

The infrastructure platform — the systems that let Discord's product teams ship without rebuilding the wheel — is actively growing. If you've built internal developer platforms, deployment systems, or observability infrastructure at scale, these are areas where Discord is actively building.

The ML and recommendations work is earlier stage than the infrastructure work but increasingly important. Discord surfaces content, suggests servers, and makes recommendations that affect whether users find value in the product. The team working on this is building out, and the problems are interesting because of the real-time, community-graph nature of the data.

### What kind of engineer thrives there versus struggles

Engineers who thrive at Discord tend to be performance-conscious as a baseline instinct, comfortable with real-time constraints, and genuinely interested in the community platform product beyond the technical challenges. The culture rewards engineers who take direct ownership — who notice a problem outside their nominal scope and fix it rather than routing it somewhere else.

Engineers who struggle tend to be people who want clean problem specifications, comfortable latency budgets, and bounded blast radius. Discord's systems have large blast radius when they fail, the latency budgets are tight, and the problem specifications often change with the product.

---

Discord's infrastructure and ML roles are the areas hiring most actively. Follow Discord on Crush to get notified when a role opens in an area that matches your background.
