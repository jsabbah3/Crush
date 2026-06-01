import Link from "next/link";
import { getAllPosts, formatDate } from "@/lib/blog";

export const metadata = {
  title: "Blog — Crush",
  description: "Insights on AI careers, job hunting strategy, and the companies worth watching.",
};

export default function BlogIndexPage() {
  const posts = getAllPosts();

  return (
    <div className="max-w-2xl mx-auto py-12">
      <div className="mb-12">
        <h1 className="text-3xl font-bold tracking-tight mb-2">From the Crush team</h1>
        <p className="text-muted-foreground text-base">
          Insights on AI careers, hiring trends, and the companies worth watching.
        </p>
      </div>

      {posts.length === 0 ? (
        <p className="text-muted-foreground">No posts yet.</p>
      ) : (
        <ul className="space-y-10">
          {posts.map((post) => (
            <li key={post.slug}>
              <Link href={`/blog/${post.slug}`} className="group block">
                <p className="text-xs text-muted-foreground mb-2 font-mono">
                  {formatDate(post.publishedAt)}
                  {post.readTime && (
                    <span className="ml-3">{post.readTime}</span>
                  )}
                </p>
                <h2 className="text-xl font-semibold group-hover:text-primary transition-colors mb-2 leading-snug">
                  {post.title}
                </h2>
                <p className="text-muted-foreground text-sm leading-relaxed">
                  {post.description}
                </p>
                <span className="mt-3 inline-block text-sm font-medium text-primary group-hover:underline underline-offset-2 transition-colors">
                  Read more →
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
