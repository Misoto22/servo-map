import { Hono } from "hono";
import type { ApiResponse, StateMetadata } from "@servo-map/shared";
import type { Env } from "../env";
import { readMetadata } from "../kv/read";

export const metadataRoute = new Hono<{ Bindings: Env }>();

// GET /api/v1/metadata
metadataRoute.get("/", async (c) => {
  // 边缘缓存：读路由数据每 ~15 分钟更新一次，短 TTL + SWR 即可
  c.header(
    "Cache-Control",
    "public, max-age=60, s-maxage=120, stale-while-revalidate=600",
  );
  const metadata = await readMetadata(c.env.KV);
  return c.json({
    status: "success",
    data: metadata,
  } satisfies ApiResponse<Record<string, StateMetadata>>);
});
