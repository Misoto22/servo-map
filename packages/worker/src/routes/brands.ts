import { Hono } from "hono";
import type { ApiResponse } from "@servo-map/shared";
import type { Env } from "../env";
import { readBrands } from "../kv/read";

export const brandsRoute = new Hono<{ Bindings: Env }>();

// GET /api/v1/brands
brandsRoute.get("/", async (c) => {
  const brands = await readBrands(c.env.KV);
  return c.json({ status: "success", data: brands } satisfies ApiResponse<string[]>);
});
