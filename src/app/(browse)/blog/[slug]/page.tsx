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
        className="text-sm text-muted-foreground hover:text-foreground transition-colors inline-flex items-center gap-1 mb-10"
      >
        ← All posts
      </Link>

      {/* Header */}
      <header className="mb-10">
        {post.readTime && (
          <p className="text-xs text-muted-foreground mb-4">{post.readTime}</p>
        )}
        <h1 className="text-3xl sm:text-4xl font-bold tracking-tight leading-tight mb-4">
          {post.title}
        </h1>
        <p className="text-muted-foreground text-base leading-relaxed">
          {post.description}
        </p>
      </header>

      <hr className="border-border mb-10" />

      {/* Body */}
      <MarkdownBody markdown={post.content} prose />

      {/* Footer */}
      <div className="mt-16 pt-8 border-t border-border">
        <p className="text-sm text-muted-foreground">
          Posted by the Crush team ·{" "}
          <Link href="/blog" className="hover:text-foreground transition-colors underline underline-offset-2">
            More posts
          </Link>
        </p>
      </div>
    </article>
  );
}
