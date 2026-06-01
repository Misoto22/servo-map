import type {
  Station,
  PriceSnapshot,
  FuelType,
} from "@servo-map/shared";
import { PRICE_HISTORY_MAX_DAYS } from "../kv/keys";

/**
 * 价格历史滚动 roll-up。
 *
 * 纯函数，无 I/O —— 由 ingest 脚本组合 KV 读写。capture 必须便宜且幂等：
 * 同一天重复运行只会刷新当天的快照，不会追加重复条目（见 mergeDailySnapshots）。
 */

/** 从一州的站点集合算出每个 fuel 的当日 min/avg/max + station_count */
export function computeDailySnapshots(
  stations: Station[],
  date: string,
): PriceSnapshot[] {
  // 按 fuel 聚合价格
  const pricesByFuel = new Map<FuelType, number[]>();
  for (const station of stations) {
    for (const p of station.prices) {
      const arr = pricesByFuel.get(p.fuel) ?? [];
      arr.push(p.price);
      pricesByFuel.set(p.fuel, arr);
    }
  }

  const snapshots: PriceSnapshot[] = [];
  for (const [fuel, prices] of pricesByFuel) {
    if (prices.length === 0) continue;
    const sum = prices.reduce((a, b) => a + b, 0);
    // avg 保留一位小数，与价格单位（cents/L）一致
    const avg = Math.round((sum / prices.length) * 10) / 10;
    snapshots.push({
      date,
      fuel,
      min: Math.min(...prices),
      avg,
      max: Math.max(...prices),
      station_count: prices.length,
    });
  }
  return snapshots;
}

/**
 * 将当日快照合并进既有滚动序列。
 *
 * 幂等：移除既有序列中同一 date 的所有条目，再追加本次的 today 快照，
 * 因此同一天多次 ingest 只保留最新一次。最后按 date 升序排序并裁剪到
 * 最近 PRICE_HISTORY_MAX_DAYS 天，控制单个 KV 值的体积。
 */
export function mergeDailySnapshots(
  existing: PriceSnapshot[],
  today: PriceSnapshot[],
  date: string,
): PriceSnapshot[] {
  const withoutToday = existing.filter((s) => s.date !== date);
  const merged = [...withoutToday, ...today];

  // 按 date 升序排序；同一 date 内按 fuel 字母序保证确定性
  merged.sort((a, b) =>
    a.date === b.date ? a.fuel.localeCompare(b.fuel) : a.date.localeCompare(b.date),
  );

  // 仅保留最近 N 个日期（按 date 去重计数），避免按条目数误裁多个 fuel
  const distinctDates = [...new Set(merged.map((s) => s.date))];
  if (distinctDates.length <= PRICE_HISTORY_MAX_DAYS) return merged;

  const keepFrom = distinctDates[distinctDates.length - PRICE_HISTORY_MAX_DAYS];
  return merged.filter((s) => s.date >= keepFrom);
}

/** 取 UTC 日历日（YYYY-MM-DD）。在 Node ingest 脚本中由标准 Date 提供 */
export function utcDate(now: Date): string {
  return now.toISOString().slice(0, 10);
}
