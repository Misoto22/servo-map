import { Hono } from "hono";
import {
  AUSTRALIAN_STATES,
  FUEL_TYPES,
  type AustralianState,
  type FuelType,
  type ApiResponse,
  type PriceTrend,
} from "@servo-map/shared";
import type { Env } from "../env";
import { readPriceHistory } from "../kv/read";

export const trendsRoute = new Hono<{ Bindings: Env }>();

// GET /api/v1/trends?state=nsw&fuel=U91
// 返回某州的每日价格快照序列；可选 fuel 过滤为单一油种。
trendsRoute.get("/", async (c) => {
  const state = c.req.query("state") as AustralianState | undefined;
  const fuel = c.req.query("fuel") as FuelType | undefined;

  // state 必填 —— 历史按州存储，无州时没有可返回的序列
  if (!state || !AUSTRALIAN_STATES.includes(state)) {
    return c.json(
      { status: "error", message: "Invalid or missing state", code: "INVALID_STATE" },
      400,
    );
  }
  if (fuel && !FUEL_TYPES.includes(fuel)) {
    return c.json(
      { status: "error", message: "Invalid fuel type", code: "INVALID_FUEL" },
      400,
    );
  }

  // 边缘缓存：历史每天最多变化一次，可放宽 TTL
  c.header(
    "Cache-Control",
    "public, max-age=60, s-maxage=120, stale-while-revalidate=600",
  );

  const series = await readPriceHistory(c.env.KV, state);
  const filtered = fuel ? series.filter((s) => s.fuel === fuel) : series;

  return c.json({
    status: "success",
    data: { state, series: filtered },
  } satisfies ApiResponse<PriceTrend>);
});
