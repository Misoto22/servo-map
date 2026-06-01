import { describe, it, expect, beforeEach } from "vitest";
import type { Station, ApiResponse, StationWithDistance } from "@servo-map/shared";
import { stationsRoute } from "../stations";
import { writeStations } from "../../kv/write";
import { createMemoryKV } from "../../kv/__mocks__/memory-kv";
import type { Env } from "../../env";

// ── Seed data ─────────────────────────────────────────────────────────────
// 3 NSW + 1 QLD station, with varied brands, fuels, coords, and prices so
// every filter/sort branch in the route can be exercised deterministically.
const NSW_STATIONS: Station[] = [
  {
    id: "nsw-1",
    name: "Shell Sydney",
    brand: "Shell",
    address: "1 George St, Sydney NSW 2000",
    suburb: "Sydney",
    state: "nsw",
    postcode: "2000",
    lat: -33.8688,
    lng: 151.2093,
    prices: [
      { fuel: "U91", price: 180.0, updated_at: "2026-05-01T00:00:00Z" },
      { fuel: "Diesel", price: 190.0, updated_at: "2026-05-01T00:00:00Z" },
    ],
  },
  {
    id: "nsw-2",
    name: "BP Parramatta",
    brand: "BP",
    address: "10 Church St, Parramatta NSW 2150",
    suburb: "Parramatta",
    state: "nsw",
    postcode: "2150",
    lat: -33.815,
    lng: 151.0,
    prices: [
      { fuel: "U91", price: 175.0, updated_at: "2026-05-01T00:00:00Z" },
      { fuel: "U95", price: 195.0, updated_at: "2026-05-01T00:00:00Z" },
    ],
  },
  {
    id: "nsw-3",
    name: "Costco Casula",
    brand: "Costco",
    address: "1 Parkers Farm Pl, Casula NSW 2170",
    suburb: "Casula",
    state: "nsw",
    postcode: "2170",
    lat: -33.9496,
    lng: 150.9006,
    prices: [
      { fuel: "U91", price: 170.0, updated_at: "2026-05-01T00:00:00Z" },
      { fuel: "Diesel", price: 185.0, updated_at: "2026-05-01T00:00:00Z" },
    ],
  },
];

const QLD_STATIONS: Station[] = [
  {
    id: "qld-1",
    name: "Ampol Brisbane",
    brand: "Ampol",
    address: "100 Queen St, Brisbane QLD 4000",
    suburb: "Brisbane",
    state: "qld",
    postcode: "4000",
    lat: -27.4698,
    lng: 153.0251,
    prices: [
      { fuel: "U91", price: 178.0, updated_at: "2026-05-01T00:00:00Z" },
      { fuel: "E10", price: 172.0, updated_at: "2026-05-01T00:00:00Z" },
    ],
  },
];

let env: Env;

async function seed(): Promise<void> {
  const kv = createMemoryKV();
  await writeStations(kv, "nsw", NSW_STATIONS);
  await writeStations(kv, "qld", QLD_STATIONS);
  env = {
    KV: kv,
    NSW_API_KEY: "",
    NSW_API_AUTH: "",
    QLD_API_TOKEN: "",
  };
}

async function listStations(qs: string) {
  const res = await stationsRoute.request(`/${qs}`, {}, env);
  const body = (await res.json()) as ApiResponse<StationWithDistance[]>;
  return { res, body };
}

async function errorCode(res: Response): Promise<string> {
  return ((await res.json()) as { code: string }).code;
}

describe("GET /stations", () => {
  beforeEach(seed);

  it("returns all stations across default states with pagination meta", async () => {
    const { res, body } = await listStations("");
    expect(res.status).toBe(200);
    expect(body.status).toBe("success");
    expect(body.data).toHaveLength(4);
    expect(body.meta).toEqual({ total: 4, limit: 100, offset: 0 });
  });

  it("filters by state (comma-separated)", async () => {
    const { body } = await listStations("?state=qld");
    expect(body.data.map((s) => s.id)).toEqual(["qld-1"]);
  });

  it("filters by brand case-insensitively", async () => {
    const { body } = await listStations("?brand=shell");
    expect(body.data.map((s) => s.id)).toEqual(["nsw-1"]);
  });

  it("filters by fuel type (only stations selling it)", async () => {
    const { body } = await listStations("?fuel=Diesel");
    expect(body.data.map((s) => s.id).sort()).toEqual(["nsw-1", "nsw-3"]);
  });

  it("matches q against suburb, name, address, and postcode prefix", async () => {
    expect((await listStations("?q=casula")).body.data.map((s) => s.id)).toEqual(["nsw-3"]);
    expect((await listStations("?q=2000")).body.data.map((s) => s.id)).toEqual(["nsw-1"]);
  });

  it("filters by exact suburb and postcode params", async () => {
    expect((await listStations("?suburb=parramatta")).body.data.map((s) => s.id)).toEqual(["nsw-2"]);
    expect((await listStations("?postcode=2170")).body.data.map((s) => s.id)).toEqual(["nsw-3"]);
  });

  it("applies geo radius, attaches distance, and sorts by distance ascending", async () => {
    const { body } = await listStations("?lat=-33.8688&lng=151.2093&radius=50");
    // QLD (~730 km away) excluded; the 3 NSW stations remain, nearest first
    expect(body.data.map((s) => s.id)).toEqual(["nsw-1", "nsw-2", "nsw-3"]);
    expect(body.data[0].distance).toBe(0);
    expect(body.data[1].distance).toBeGreaterThan(0);
    expect(body.data.every((s) => typeof s.distance === "number")).toBe(true);
  });

  it("sorts by price ascending when sort+fuel are set", async () => {
    const { body } = await listStations("?sort=price_asc&fuel=U91");
    expect(body.data.map((s) => s.id)).toEqual(["nsw-3", "nsw-2", "qld-1", "nsw-1"]);
  });

  it("sorts by price descending", async () => {
    const { body } = await listStations("?sort=price_desc&fuel=U91");
    expect(body.data.map((s) => s.id)).toEqual(["nsw-1", "qld-1", "nsw-2", "nsw-3"]);
  });

  it("paginates with limit and offset while reporting full total", async () => {
    const { body } = await listStations("?sort=price_asc&fuel=U91&limit=2&offset=1");
    expect(body.data.map((s) => s.id)).toEqual(["nsw-2", "qld-1"]);
    expect(body.meta).toEqual({ total: 4, limit: 2, offset: 1 });
  });

  it("rejects an invalid state with 400 INVALID_STATE", async () => {
    const res = await stationsRoute.request("/?state=zz", {}, env);
    expect(res.status).toBe(400);
    expect(await errorCode(res)).toBe("INVALID_STATE");
  });

  it("rejects an invalid fuel with 400 INVALID_FUEL", async () => {
    const res = await stationsRoute.request("/?fuel=XYZ", {}, env);
    expect(res.status).toBe(400);
    expect(await errorCode(res)).toBe("INVALID_FUEL");
  });

  it("rejects partial geo params with 400 INVALID_GEO", async () => {
    const res = await stationsRoute.request("/?lat=-33.8", {}, env);
    expect(res.status).toBe(400);
    expect(await errorCode(res)).toBe("INVALID_GEO");
  });
});

describe("GET /stations/:id", () => {
  beforeEach(seed);

  it("returns a single station by id", async () => {
    const res = await stationsRoute.request("/nsw-1", {}, env);
    expect(res.status).toBe(200);
    const body = (await res.json()) as ApiResponse<Station>;
    expect(body.data.id).toBe("nsw-1");
    expect(body.data.name).toBe("Shell Sydney");
  });

  it("attaches distance when lat/lng are provided", async () => {
    const res = await stationsRoute.request("/nsw-1?lat=-33.815&lng=151.0", {}, env);
    const body = (await res.json()) as ApiResponse<StationWithDistance>;
    expect(body.data.distance).toBeGreaterThan(18);
    expect(body.data.distance).toBeLessThan(22);
  });

  it("returns 404 STATION_NOT_FOUND for an unknown id", async () => {
    const res = await stationsRoute.request("/nope-9999", {}, env);
    expect(res.status).toBe(404);
    expect(await errorCode(res)).toBe("STATION_NOT_FOUND");
  });
});
