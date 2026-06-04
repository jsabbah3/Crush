import type { MetadataRoute } from "next";
import { prisma } from "@/lib/prisma";
import { getAllPosts } from "@/lib/blog";

const BASE = "https://crushco.app";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [companies, collections] = await Promise.all([
    prisma.company.findMany({
      select: { slug: true, updatedAt: true },
      orderBy: { name: "asc" },
    }),
    prisma.collection.findMany({
      select: { slug: true, updatedAt: true },
    }),
  ]);

  const blogPosts = getAllPosts();

  const staticRoutes: MetadataRoute.Sitemap = [
    { url: BASE, lastModified: new Date(), changeFrequency: "weekly", priority: 1 },
    { url: `${BASE}/companies`, lastModified: new Date(), changeFrequency: "daily", priority: 0.9 },
    { url: `${BASE}/collections`, lastModified: new Date(), changeFrequency: "weekly", priority: 0.8 },
    { url: `${BASE}/blog`, lastModified: new Date(), changeFrequency: "weekly", priority: 0.8 },
  ];

  const companyRoutes: MetadataRoute.Sitemap = companies.map((c) => ({
    url: `${BASE}/companies/${c.slug}`,
    lastModified: c.updatedAt,
    changeFrequency: "daily",
    priority: 0.7,
  }));

  const collectionRoutes: MetadataRoute.Sitemap = collections.map((c) => ({
    url: `${BASE}/collections/${c.slug}`,
    lastModified: c.updatedAt,
    changeFrequency: "weekly",
    priority: 0.6,
  }));

  const blogRoutes: MetadataRoute.Sitemap = blogPosts.map((p) => ({
    url: `${BASE}/blog/${p.slug}`,
    lastModified: new Date(p.publishedAt),
    changeFrequency: "monthly",
    priority: 0.6,
  }));

  return [...staticRoutes, ...companyRoutes, ...collectionRoutes, ...blogRoutes];
}
