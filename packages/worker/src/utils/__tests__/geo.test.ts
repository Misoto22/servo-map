import { describe, it, expect } from "vitest";
import { haversine } from "../geo";

// Known coordinates (lat, lng) for reference-distance assertions
const SYDNEY = [-33.8688, 151.2093] as const;
const MELBOURNE = [-37.8136, 144.9631] as const;
const PARRAMATTA = [-33.815, 151.0] as const;

describe("haversine", () => {
  it("returns 0 for identical coordinates", () => {
    expect(haversine(...SYDNEY, ...SYDNEY)).toBe(0);
  });

  it("matches the known Sydney–Melbourne great-circle distance (~713 km)", () => {
    const d = haversine(...SYDNEY, ...MELBOURNE);
    expect(d).toBeGreaterThan(710);
    expect(d).toBeLessThan(716);
  });

  it("computes a short intra-city distance (Sydney–Parramatta ~20 km)", () => {
    const d = haversine(...SYDNEY, ...PARRAMATTA);
    expect(d).toBeGreaterThan(18);
    expect(d).toBeLessThan(22);
  });

  it("is symmetric", () => {
    expect(haversine(...SYDNEY, ...MELBOURNE)).toBe(
      haversine(...MELBOURNE, ...SYDNEY),
    );
  });
});
