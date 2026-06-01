import { describe, it, expect, beforeEach } from "vitest";
import type { ApiResponse, PriceTrend, PriceSnapshot } from "@servo-map/shared";
import { trendsRoute } from "../trends";
import { createMemoryKV } from "../../kv/__mocks__/memory-kv";
import { KV_KEYS } from "../../kv/keys";
import type { Env } from "../../env";

const NSW_HISTORY: PriceSnapshot[] = [
  { date: "2026-06-01", fuel: "U91", min: 170, avg: 180, max: 190, station_count: 3 },
  { date: "2026-06-01", fuel: "Diesel", min: 195, avg: 200, max: 205, station_count: 3 },
  { date: "2026-06-02", fuel: "U91", min: 172, avg: 182, max: 192, station_count: 3 },
];

let env: Env;

async function seed(): Promise<void> {
  const kv = createMemoryKV();
  await kv.put(KV_KEYS.priceHistory("nsw"), JSON.stringify(NSW_HISTORY));
  env = { KV: kv, NSW_API_KEY: "", NSW_API_AUTH: "", QLD_API_TOKEN: "" };
}

describe("GET /trends", () => {
  beforeEach(seed);

  it("returns the full series for a state", async () => {
    const res = await trendsRoute.request("/?state=nsw", {}, env);
    expect(res.status).toBe(200);
    const body = (await res.json()) as ApiResponse<PriceTrend>;
    expect(body.data.state).toBe("nsw");
    expect(body.data.series).toHaveLength(3);
  });

  it("filters the series by fuel when provided", async () => {
    const res = await trendsRoute.request("/?state=nsw&fuel=U91", {}, env);
    const body = (await res.json()) as ApiResponse<PriceTrend>;
    expect(body.data.series).toHaveLength(2);
    expect(body.data.series.every((s) => s.fuel === "U91")).toBe(true);
  });

  it("returns an empty series for a state with no history", async () => {
    const res = await trendsRoute.request("/?state=wa", {}, env);
    const body = (await res.json()) as ApiResponse<PriceTrend>;
    expect(body.data.state).toBe("wa");
    expect(body.data.series).toEqual([]);
  });

  it("sets a Cache-Control header", async () => {
    const res = await trendsRoute.request("/?state=nsw", {}, env);
    expect(res.headers.get("Cache-Control")).toBe(
      "public, max-age=60, s-maxage=120, stale-while-revalidate=600",
    );
  });

  it("rejects a missing or invalid state with 400 INVALID_STATE", async () => {
    const missing = await trendsRoute.request("/", {}, env);
    expect(missing.status).toBe(400);
    expect(((await missing.json()) as { code: string }).code).toBe("INVALID_STATE");

    const invalid = await trendsRoute.request("/?state=zz", {}, env);
    expect(invalid.status).toBe(400);
    expect(((await invalid.json()) as { code: string }).code).toBe("INVALID_STATE");
  });

  it("rejects an invalid fuel with 400 INVALID_FUEL", async () => {
    const res = await trendsRoute.request("/?state=nsw&fuel=XYZ", {}, env);
    expect(res.status).toBe(400);
    expect(((await res.json()) as { code: string }).code).toBe("INVALID_FUEL");
  });
});
