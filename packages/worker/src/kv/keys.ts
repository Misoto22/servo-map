import type { AustralianState } from "@servo-map/shared";

export const KV_KEYS = {
  stationsByState: (state: AustralianState) => `stations:${state}` as const,
  stationById: (id: string) => `station:${id}` as const,
  brands: "brands" as const,
  metadata: "metadata" as const,
  refData: (state: AustralianState) => `ref:${state}` as const,
  // 单条 KV 值存储该州的滚动每日价格快照数组（上限 ~90 天）
  priceHistory: (state: AustralianState) => `history:${state}` as const,
};

/** 价格历史滚动窗口上限（天）—— 控制单个 history:{state} 值的体积 */
export const PRICE_HISTORY_MAX_DAYS = 90;
