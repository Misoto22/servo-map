import { describe, it, expect } from "vitest";
import type { FuelType, PriceSnapshot } from "@servo-map/shared";
import { seriesForFuel, cheapestDayToFill, cyclePosition } from "@/lib/trends";

/** Build a snapshot with sensible defaults; override per case. */
function snap(
  date: string,
  avg: number,
  opts: Partial<PriceSnapshot> = {},
): PriceSnapshot {
  return {
    date,
    fuel: opts.fuel ?? "U91",
    min: opts.min ?? avg - 2,
    avg,
    max: opts.max ?? avg + 2,
    station_count: opts.station_count ?? 100,
  };
}

describe("seriesForFuel", () => {
  it("filters to one fuel and sorts ascending by date", () => {
    const series: PriceSnapshot[] = [
      snap("2026-03-03", 190),
      { ...snap("2026-03-01", 250), fuel: "Diesel" as FuelType },
      snap("2026-03-01", 188),
      snap("2026-03-02", 189),
    ];
    const out = seriesForFuel(series, "U91");
    expect(out.map((s) => s.date)).toEqual([
      "2026-03-01",
      "2026-03-02",
      "2026-03-03",
    ]);
    expect(out.every((s) => s.fuel === "U91")).toBe(true);
  });

  it("returns an empty array for an empty series", () => {
    expect(seriesForFuel([], "U91")).toEqual([]);
  });

  it("returns an empty array when the fuel has no snapshots", () => {
    const series = [{ ...snap("2026-03-01", 250), fuel: "Diesel" as FuelType }];
    expect(seriesForFuel(series, "U91")).toEqual([]);
  });
});

describe("cheapestDayToFill", () => {
  it("returns the weekday with the lowest averaged daily avg", () => {
    // 2026-03-01 is a Sunday (UTC). Mon=lowest here.
    const series: PriceSnapshot[] = [
      snap("2026-03-01", 200), // Sunday
      snap("2026-03-02", 180), // Monday
      snap("2026-03-03", 195), // Tuesday
      snap("2026-03-08", 202), // Sunday
      snap("2026-03-09", 182), // Monday
    ];
    const out = cheapestDayToFill(series, "U91");
    expect(out).not.toBeNull();
    expect(out?.weekday).toBe("Monday");
    expect(out?.avg).toBeCloseTo((180 + 182) / 2, 5);
  });

  it("parses dates in UTC, not local time", () => {
    // Single Monday snapshot — must report Monday regardless of host TZ.
    const out = cheapestDayToFill([snap("2026-03-02", 180)], "U91");
    expect(out?.weekday).toBe("Monday");
  });

  it("returns null for an empty series", () => {
    expect(cheapestDayToFill([], "U91")).toBeNull();
  });

  it("returns null when the fuel has no snapshots", () => {
    const series = [{ ...snap("2026-03-01", 250), fuel: "Diesel" as FuelType }];
    expect(cheapestDayToFill(series, "U91")).toBeNull();
  });

  it("works with a single data point", () => {
    const out = cheapestDayToFill([snap("2026-03-03", 191)], "U91");
    // 2026-03-03 is a Tuesday (UTC).
    expect(out).toEqual({ weekday: "Tuesday", avg: 191 });
  });
});

describe("cyclePosition", () => {
  it("reports 'low' when latest sits in the bottom third", () => {
    const series: PriceSnapshot[] = [
      snap("2026-03-01", 180),
      snap("2026-03-02", 210),
      snap("2026-03-03", 185), // latest, near the low
    ];
    const out = cyclePosition(series, "U91");
    expect(out).toEqual({ current: 185, min: 180, max: 210, position: "low" });
  });

  it("reports 'high' when latest sits in the top third", () => {
    const series: PriceSnapshot[] = [
      snap("2026-03-01", 180),
      snap("2026-03-02", 190),
      snap("2026-03-03", 209), // latest, near the high
    ];
    const out = cyclePosition(series, "U91");
    expect(out?.position).toBe("high");
  });

  it("reports 'mid' when latest sits in the middle third", () => {
    const series: PriceSnapshot[] = [
      snap("2026-03-01", 180),
      snap("2026-03-02", 210),
      snap("2026-03-03", 195), // latest, middle
    ];
    const out = cyclePosition(series, "U91");
    expect(out?.position).toBe("mid");
  });

  it("guards against min === max (flat window) -> 'mid', no div-by-zero", () => {
    const series: PriceSnapshot[] = [
      snap("2026-03-01", 190),
      snap("2026-03-02", 190),
    ];
    const out = cyclePosition(series, "U91");
    expect(out).toEqual({ current: 190, min: 190, max: 190, position: "mid" });
  });

  it("works with a single data point (min === max === current)", () => {
    const out = cyclePosition([snap("2026-03-01", 188)], "U91");
    expect(out).toEqual({ current: 188, min: 188, max: 188, position: "mid" });
  });

  it("returns null for an empty series", () => {
    expect(cyclePosition([], "U91")).toBeNull();
  });

  it("returns null when the fuel has no snapshots", () => {
    const series = [{ ...snap("2026-03-01", 250), fuel: "Diesel" as FuelType }];
    expect(cyclePosition(series, "U91")).toBeNull();
  });
});
