import type { FuelPrice } from "@servo-map/shared";

// --- 价格颜色基于百分位动态计算 ---

export interface PriceRange {
  /** 低于此值为 cheap（绿色），P33 */
  cheapBelow: number;
  /** 低于此值为 mid（黄色），P66 */
  midBelow: number;
}

/**
 * 从一组价格中计算百分位阈值
 * 底部 33% = cheap, 中间 33% = mid, 顶部 33% = expensive
 */
export function computePriceRange(prices: number[]): PriceRange {
  if (prices.length === 0) return { cheapBelow: 0, midBelow: 0 };
  const sorted = [...prices].sort((a, b) => a - b);
  const p33 = sorted[Math.floor(sorted.length * 0.33)] ?? sorted[0];
  const p66 = sorted[Math.floor(sorted.length * 0.66)] ?? sorted[sorted.length - 1];
  return { cheapBelow: p33, midBelow: p66 };
}

export function priceColorClass(price: number, range?: PriceRange): string {
  if (!range) return "text-text";
  if (price <= range.cheapBelow) return "text-price-cheap";
  if (price <= range.midBelow) return "text-price-mid";
  return "text-price-expensive";
}

export function priceColorHex(price: number, range?: PriceRange): string {
  if (!range) return "#9B9489";
  if (price <= range.cheapBelow) return "#4ADE80";
  if (price <= range.midBelow) return "#FBBF24";
  return "#F87171";
}

/**
 * 格式化价格显示：分 → 元.分
 */
export function formatPrice(cents: number): string {
  return (cents / 100).toFixed(1);
}

/**
 * 格式化价格（保留原始分数显示）
 */
export function formatPriceCents(cents: number): string {
  return cents.toFixed(1);
}

/**
 * 获取某种燃油的价格
 */
export function getFuelPrice(
  prices: FuelPrice[],
  fuelType: string,
): FuelPrice | undefined {
  return prices.find((p) => p.fuel === fuelType);
}

/**
 * 格式化距离显示
 */
export function formatDistance(km: number): string {
  if (km < 1) return `${Math.round(km * 1000)}m`;
  return `${km.toFixed(1)}km`;
}

/**
 * 格式化相对时间
 */
export function timeAgo(dateStr: string): string {
  const now = Date.now();
  const then = new Date(dateStr).getTime();
  const diffMin = Math.floor((now - then) / 60000);

  if (diffMin < 1) return "just now";
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHr = Math.floor(diffMin / 60);
  if (diffHr < 24) return `${diffHr}h ago`;
  const diffDay = Math.floor(diffHr / 24);
  return `${diffDay}d ago`;
}

/**
 * classnames 简易合并工具
 */
export function cn(...classes: (string | false | null | undefined)[]): string {
  return classes.filter(Boolean).join(" ");
}
