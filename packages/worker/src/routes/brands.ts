import { Hono } from "hono";
import type { ApiResponse } from "@servo-map/shared";
import type { Env } from "../env";
import { readBrands } from "../kv/read";

export const brandsRoute = new Hono<{ Bindings: Env }>();

// GET /api/v1/brands
brandsRoute.get("/", async (c) => {
  // 边缘缓存：品牌列表变化极慢，短 TTL + SWR 即可
  c.header(
    "Cache-Control",
    "public, max-age=60, s-maxage=120, stale-while-revalidate=600",
  );
  const brands = await readBrands(c.env.KV);
  return c.json({ status: "success", data: brands } satisfies ApiResponse<string[]>);
});
