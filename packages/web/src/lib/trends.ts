import type { FuelType, PriceSnapshot } from "@servo-map/shared";

/** UTC weekday names, indexed by Date.getUTCDay() (0 = Sunday). */
const WEEKDAY_NAMES = [
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
] as const;

/**
 * Snapshots for a single fuel, sorted ascending by date.
 * The backend may return multiple fuels interleaved; this narrows + orders.
 */
export function seriesForFuel(
  series: PriceSnapshot[],
  fuel: FuelType,
): PriceSnapshot[] {
  return series
    .filter((s) => s.fuel === fuel)
    .sort((a, b) => a.date.localeCompare(b.date));
}

/**
 * Cheapest UTC weekday to fill up, by averaging each day's `avg` per weekday.
 *
 * Why UTC: snapshot dates are calendar days in UTC, so we parse them as
 * `YYYY-MM-DDT00:00:00Z` to read the weekday in the same frame the data was
 * bucketed in — avoiding the local-timezone off-by-one a bare `new Date(date)`
 * would introduce. Returns null when the fuel has no snapshots.
 */
export function cheapestDayToFill(
  series: PriceSnapshot[],
  fuel: FuelType,
): { weekday: string; avg: number } | null {
  const snapshots = seriesForFuel(series, fuel);
  if (snapshots.length === 0) return null;

  const sums = new Array<number>(7).fill(0);
  const counts = new Array<number>(7).fill(0);

  for (const snap of snapshots) {
    const day = new Date(`${snap.date}T00:00:00Z`).getUTCDay();
    sums[day] += snap.avg;
    counts[day] += 1;
  }

  let bestDay = -1;
  let bestAvg = Infinity;
  for (let day = 0; day < 7; day += 1) {
    if (counts[day] === 0) continue;
    const dayAvg = sums[day] / counts[day];
    if (dayAvg < bestAvg) {
      bestAvg = dayAvg;
      bestDay = day;
    }
  }

  if (bestDay === -1) return null;
  return { weekday: WEEKDAY_NAMES[bestDay], avg: bestAvg };
}

export type CyclePosition = "low" | "mid" | "high";

/**
 * Where the latest day's average sits within the window's min..max for a fuel.
 * Bottom third = "low", top third = "high", otherwise "mid".
 *
 * Returns null with fewer than one data point. When min === max (a flat window)
 * the position is "mid" — there is no meaningful cycle to place it in, and this
 * also guards the division below against a zero span.
 */
export function cyclePosition(
  series: PriceSnapshot[],
  fuel: FuelType,
): { current: number; min: number; max: number; position: CyclePosition } | null {
  const snapshots = seriesForFuel(series, fuel);
  if (snapshots.length < 1) return null;

  const current = snapshots[snapshots.length - 1].avg;
  let min = snapshots[0].avg;
  let max = snapshots[0].avg;
  for (const snap of snapshots) {
    if (snap.avg < min) min = snap.avg;
    if (snap.avg > max) max = snap.avg;
  }

  if (min === max) {
    return { current, min, max, position: "mid" };
  }

  const ratio = (current - min) / (max - min);
  const position: CyclePosition =
    ratio <= 1 / 3 ? "low" : ratio >= 2 / 3 ? "high" : "mid";

  return { current, min, max, position };
}
