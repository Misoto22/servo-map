import { Hono } from "hono";
import {
  AUSTRALIAN_STATES,
  FUEL_TYPES,
  type AustralianState,
  type FuelType,
  type Station,
  type StationWithDistance,
  type ApiResponse,
  type PaginationMeta,
} from "@servo-map/shared";
import type { Env } from "../env";
import { readStationsByState, readStationById } from "../kv/read";
import { haversine } from "../utils/geo";

export const stationsRoute = new Hono<{ Bindings: Env }>();

const MAX_LIMIT = 500;
const DEFAULT_LIMIT = 100;

// GET /api/v1/stations
stationsRoute.get("/", async (c) => {
  const query = c.req.query();

  // 解析参数
  const stateParam = query.state?.split(",").filter(Boolean) as AustralianState[] | undefined;
  const brand = query.brand?.trim();
  const fuel = query.fuel as FuelType | undefined;
  const suburb = query.suburb?.trim().toLowerCase();
  const postcode = query.postcode?.trim();
  const lat = query.lat ? parseFloat(query.lat) : undefined;
  const lng = query.lng ? parseFloat(query.lng) : undefined;
  const radius = query.radius ? parseFloat(query.radius) : undefined;
  const limit = Math.min(Math.max(parseInt(query.limit ?? "") || DEFAULT_LIMIT, 1), MAX_LIMIT);
  const offset = Math.max(parseInt(query.offset ?? "") || 0, 0);
  const sort = query.sort as "price_asc" | "price_desc" | undefined;

  // 参数校验
  if (stateParam?.some((s) => !AUSTRALIAN_STATES.includes(s))) {
    return c.json({ status: "error", message: "Invalid state", code: "INVALID_STATE" }, 400);
  }
  if (fuel && !FUEL_TYPES.includes(fuel)) {
    return c.json({ status: "error", message: "Invalid fuel type", code: "INVALID_FUEL" }, 400);
  }
  if ((lat != null || lng != null || radius != null) && (lat == null || lng == null || radius == null)) {
    return c.json({ status: "error", message: "lat, lng, and radius must all be provided", code: "INVALID_GEO" }, 400);
  }

  // 确定需要读取哪些州的数据
  const statesToRead = stateParam ?? (["nsw", "qld", "tas", "act"] as AustralianState[]);
  const chunks = await Promise.all(
    statesToRead.map((s) => readStationsByState(c.env.KV, s)),
  );
  let stations: Station[] = chunks.flat();

  // 内存筛选
  if (brand) {
    const brandLower = brand.toLowerCase();
    stations = stations.filter((s) => s.brand.toLowerCase() === brandLower);
  }
  if (fuel) {
    stations = stations.filter((s) => s.prices.some((p) => p.fuel === fuel));
  }
  if (suburb) {
    stations = stations.filter((s) => s.suburb.toLowerCase() === suburb);
  }
  if (postcode) {
    stations = stations.filter((s) => s.postcode === postcode);
  }

  // 距离计算 + 半径筛选
  let results: StationWithDistance[] = stations;
  if (lat != null && lng != null && radius != null) {
    results = stations
      .map((s) => ({ ...s, distance: haversine(lat, lng, s.lat, s.lng) }))
      .filter((s) => s.distance! <= radius);
  }

  // 排序
  if (lat != null && lng != null) {
    results.sort((a, b) => (a.distance ?? 0) - (b.distance ?? 0));
  } else if (sort && fuel) {
    const dir = sort === "price_asc" ? 1 : -1;
    results.sort((a, b) => {
      const priceA = a.prices.find((p) => p.fuel === fuel)?.price ?? Infinity;
      const priceB = b.prices.find((p) => p.fuel === fuel)?.price ?? Infinity;
      return (priceA - priceB) * dir;
    });
  }

  const total = results.length;
  const paged = results.slice(offset, offset + limit);
  const meta: PaginationMeta = { total, limit, offset };

  return c.json({ status: "success", data: paged, meta } satisfies ApiResponse<StationWithDistance[]>);
});

// GET /api/v1/stations/:id
stationsRoute.get("/:id", async (c) => {
  const id = c.req.param("id");
  const station = await readStationById(c.env.KV, id);

  if (!station) {
    return c.json({ status: "error", message: "Station not found", code: "STATION_NOT_FOUND" }, 404);
  }

  const lat = c.req.query("lat") ? parseFloat(c.req.query("lat")!) : undefined;
  const lng = c.req.query("lng") ? parseFloat(c.req.query("lng")!) : undefined;

  const result: StationWithDistance = lat != null && lng != null
    ? { ...station, distance: haversine(lat, lng, station.lat, station.lng) }
    : station;

  return c.json({ status: "success", data: result } satisfies ApiResponse<StationWithDistance>);
});
