import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/site";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: { userAgent: "*", allow: "/" },
    // sitemap index 入口（generateSitemaps 产出 /sitemap/<state>.xml 子站点地图）
    sitemap: `${SITE_URL}/sitemap.xml`,
    host: SITE_URL,
  };
}
