import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: ["/api/", "/dashboard", "/settings", "/matches", "/onboarding"],
    },
    sitemap: "https://crushco.app/sitemap.xml",
  };
}
