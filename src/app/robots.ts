import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  const base = process.env.PUBLIC_URL?.replace(/\/$/, "");
  return {
    rules: { userAgent: "*", allow: "/", disallow: ["/admin", "/api/", "/embed"] },
    ...(base && { sitemap: `${base}/sitemap.xml` }),
  };
}
