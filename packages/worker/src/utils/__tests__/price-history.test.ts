import { describe, it, expect } from "vitest";
import type { Station, PriceSnapshot } from "@servo-map/shared";
import {
  computeDailySnapshots,
  mergeDailySnapshots,
  utcDate,
} from "../price-history";
import { PRICE_HISTORY_MAX_DAYS } from "../../kv/keys";

function station(id: string, prices: Station["prices"]): Station {
  return {
    id,
    name: id,
    brand: "Test",
    address: "1 Test St",
    suburb: "Testville",
    state: "nsw",
    postcode: "2000",
    lat: -33.8,
    lng: 151.2,
    prices,
  };
}

describe("computeDailySnapshots", () => {
  it("aggregates min/avg/max + station_count per fuel", () => {
    const stations = [
      station("a", [
        { fuel: "U91", price: 170, updated_at: "2026-06-01T00:00:00Z" },
        { fuel: "Diesel", price: 200, updated_at: "2026-06-01T00:00:00Z" },
      ]),
      station("b", [
        { fuel: "U91", price: 180, updated_at: "2026-06-01T00:00:00Z" },
      ]),
      station("c", [
        { fuel: "U91", price: 190, updated_at: "2026-06-01T00:00:00Z" },
      ]),
    ];
    const snaps = computeDailySnapshots(stations, "2026-06-01");
    const u91 = snaps.find((s) => s.fuel === "U91")!;
    expect(u91.min).toBe(170);
    expect(u91.max).toBe(190);
    expect(u91.avg).toBe(180);
    expect(u91.station_count).toBe(3);
    expect(u91.date).toBe("2026-06-01");

    const diesel = snaps.find((s) => s.fuel === "Diesel")!;
    expect(diesel.station_count).toBe(1);
    expect(diesel.min).toBe(200);
  });

  it("rounds avg to one decimal", () => {
    const stations = [
      station("a", [{ fuel: "U91", price: 100, updated_at: "x" }]),
      station("b", [{ fuel: "U91", price: 101, updated_at: "x" }]),
      station("c", [{ fuel: "U91", price: 101, updated_at: "x" }]),
    ];
    const snaps = computeDailySnapshots(stations, "2026-06-01");
    // (100+101+101)/3 = 100.666… → 100.7
    expect(snaps.find((s) => s.fuel === "U91")!.avg).toBe(100.7);
  });

  it("returns no snapshot for fuels with no prices", () => {
    const snaps = computeDailySnapshots([station("a", [])], "2026-06-01");
    expect(snaps).toEqual([]);
  });
});

describe("mergeDailySnapshots", () => {
  const snap = (date: string, fuel: PriceSnapshot["fuel"], v: number): PriceSnapshot => ({
    date,
    fuel,
    min: v,
    avg: v,
    max: v,
    station_count: 1,
  });

  it("appends a new day to the series in date order", () => {
    const existing = [snap("2026-06-01", "U91", 170)];
    const today = [snap("2026-06-02", "U91", 175)];
    const merged = mergeDailySnapshots(existing, today, "2026-06-02");
    expect(merged.map((s) => s.date)).toEqual(["2026-06-01", "2026-06-02"]);
  });

  it("is idempotent for the same day (replaces, never duplicates)", () => {
    const existing = [snap("2026-06-02", "U91", 170)];
    const today = [snap("2026-06-02", "U91", 999)];
    const merged = mergeDailySnapshots(existing, today, "2026-06-02");
    expect(merged.length).toBe(1);
    expect(merged[0].min).toBe(999);
  });

  it("caps the series to PRICE_HISTORY_MAX_DAYS distinct days", () => {
    const existing: PriceSnapshot[] = [];
    for (let i = 0; i < PRICE_HISTORY_MAX_DAYS + 10; i++) {
      const date = `2026-01-${String((i % 28) + 1).padStart(2, "0")}`;
      // 用唯一年份段保证 distinct date 数量 = i+1
      const uniqueDate = `20${String(26 + Math.floor(i / 28)).padStart(2, "0")}-01-${String((i % 28) + 1).padStart(2, "0")}`;
      void date;
      existing.push(snap(uniqueDate, "U91", 100 + i));
    }
    const today = [snap("2099-12-31", "U91", 200)];
    const merged = mergeDailySnapshots(existing, today, "2099-12-31");
    const distinctDays = new Set(merged.map((s) => s.date)).size;
    expect(distinctDays).toBe(PRICE_HISTORY_MAX_DAYS);
    // 最新一天必须保留
    expect(merged.some((s) => s.date === "2099-12-31")).toBe(true);
  });

  it("keeps multiple fuels for the same day without over-trimming", () => {
    const existing: PriceSnapshot[] = [];
    // 90 个不同日期，每天 2 个 fuel → 180 条目，但 distinct days = 90
    for (let i = 0; i < PRICE_HISTORY_MAX_DAYS; i++) {
      const d = `2026-${String(Math.floor(i / 28) + 1).padStart(2, "0")}-${String((i % 28) + 1).padStart(2, "0")}`;
      existing.push(snap(d, "U91", 100));
      existing.push(snap(d, "Diesel", 120));
    }
    const today = [snap("2027-01-01", "U91", 150), snap("2027-01-01", "Diesel", 170)];
    const merged = mergeDailySnapshots(existing, today, "2027-01-01");
    const distinctDays = new Set(merged.map((s) => s.date)).size;
    expect(distinctDays).toBe(PRICE_HISTORY_MAX_DAYS);
    // 保留的最新一天应同时含两个 fuel
    const lastDay = merged.filter((s) => s.date === "2027-01-01");
    expect(lastDay.map((s) => s.fuel).sort()).toEqual(["Diesel", "U91"]);
  });
});

describe("utcDate", () => {
  it("formats a Date as YYYY-MM-DD in UTC", () => {
    expect(utcDate(new Date("2026-06-02T13:45:00Z"))).toBe("2026-06-02");
  });
});
