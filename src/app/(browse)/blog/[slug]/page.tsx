import { notFound } from "next/navigation";
import Link from "next/link";
import { getAllPosts, getPost } from "@/lib/blog";
import { MarkdownBody } from "@/components/markdown-body";
import type { Metadata } from "next";

type Props = { params: Promise<{ slug: string }> };

export async function generateStaticParams() {
  const posts = getAllPosts();
  return posts.map((post) => ({ slug: post.slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const post = getPost(slug);
  if (!post) return {};

  return {
    title: `${post.title} — Crush`,
    description: post.description,
    openGraph: {
      title: post.title,
      description: post.description,
      type: "article",
      publishedTime: post.publishedAt,
      url: `https://crushco.app/blog/${slug}`,
    },
    twitter: {
      card: "summary_large_image",
      title: post.title,
      description: post.description,
    },
  };
}

export default async function BlogPostPage({ params }: Props) {
  const { slug } = await params;
  const post = getPost(slug);
  if (!post) notFound();

  return (
    <article className="max-w-2xl mx-auto py-12">
      {/* Back link */}
      <Link
        href="/blog"
        className="text-sm text-muted-foreground hover:text-foreground transition-colors inline-flex items-center gap-1 mb-10 rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/60"
      >
        <span className="transition-transform duration-[var(--dur-fast)] group-hover:-translate-x-0.5">←</span> All posts
      </Link>

      {/* Header */}
      <header className="mb-10">
        {post.readTime && (
          <p className="font-mono text-[11px] uppercase tracking-wider text-muted-foreground/70 mb-4">
            {post.readTime}
          </p>
        )}
        <h1 className="font-heading text-3xl sm:text-4xl font-bold tracking-tight leading-tight text-balance mb-4">
          {post.title}
        </h1>
        <p className="text-muted-foreground text-lg leading-relaxed max-w-[62ch]">
          {post.description}
        </p>
      </header>

      <hr className="border-border mb-10" />

      {/* Body */}
      <MarkdownBody markdown={post.content} prose />

      {/* Inline CTA — blog is a top-of-funnel SEO surface */}
      <aside className="mt-16 rounded-xl border bg-card p-6 sm:p-7">
        <p className="font-heading text-lg font-bold tracking-tight">
          Track the companies you&apos;d actually leave for
        </p>
        <p className="mt-1.5 text-sm text-muted-foreground leading-relaxed max-w-[60ch]">
          Crush watches your shortlist and sends one alert the moment your exact role opens. No job boards, no noise.
        </p>
        <Link
          href="/companies"
          className="mt-4 inline-flex items-center gap-1.5 rounded-lg bg-foreground px-4 py-2 text-sm font-medium text-background transition-colors hover:bg-foreground/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/60"
        >
          Browse companies
          <span className="transition-transform duration-[var(--dur-fast)] group-hover:translate-x-0.5">→</span>
        </Link>
      </aside>

      {/* Footer */}
      <div className="mt-10 pt-8 border-t border-border">
        <p className="text-sm text-muted-foreground">
          Posted by the Crush team ·{" "}
          <Link href="/blog" className="hover:text-foreground transition-colors underline underline-offset-2 rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/60">
            More posts
          </Link>
        </p>
      </div>
    </article>
  );
}
