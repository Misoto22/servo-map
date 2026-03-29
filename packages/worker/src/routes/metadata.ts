import { Hono } from "hono";
import type { ApiResponse, StateMetadata } from "@servo-map/shared";
import type { Env } from "../env";
import { readMetadata } from "../kv/read";

export const metadataRoute = new Hono<{ Bindings: Env }>();

// GET /api/v1/metadata
metadataRoute.get("/", async (c) => {
  const metadata = await readMetadata(c.env.KV);
  return c.json({
    status: "success",
    data: metadata,
  } satisfies ApiResponse<Record<string, StateMetadata>>);
});
