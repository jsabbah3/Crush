import Link from "next/link";
import { getAllPosts } from "@/lib/blog";

export const metadata = {
  title: "Blog — Crush",
  description: "Insights on AI careers, job hunting strategy, and the companies worth watching.",
};

export default function BlogIndexPage() {
  const posts = getAllPosts();

  return (
    <div className="max-w-2xl mx-auto py-12">
      <div className="mb-12 space-y-2">
        <h1 className="font-heading text-3xl font-bold tracking-tight text-balance">From the Crush team</h1>
        <p className="text-muted-foreground text-base max-w-[60ch]">
          Insights on AI careers, hiring trends, and the companies worth watching.
        </p>
      </div>

      {posts.length === 0 ? (
        <p className="text-muted-foreground">No posts yet.</p>
      ) : (
        <ul className="divide-y divide-border border-t border-border">
          {posts.map((post) => (
            <li key={post.slug}>
              <Link
                href={`/blog/${post.slug}`}
                className="group block -mx-4 px-4 py-6 rounded-xl transition-colors hover:bg-muted/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/60"
              >
                {post.readTime && (
                  <p className="font-mono text-[11px] uppercase tracking-wider text-muted-foreground/70 mb-2">
                    {post.readTime}
                  </p>
                )}
                <h2 className="font-heading text-xl font-bold tracking-tight leading-snug text-balance transition-colors group-hover:text-primary mb-2">
                  {post.title}
                </h2>
                <p className="text-muted-foreground text-sm leading-relaxed max-w-[62ch]">
                  {post.description}
                </p>
                <span className="mt-3 inline-flex items-center gap-1 text-sm font-medium text-primary">
                  Read more
                  <span className="transition-transform duration-[var(--dur-fast)] group-hover:translate-x-0.5">→</span>
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
