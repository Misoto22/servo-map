import type { FuelPrice } from "@servo-map/shared";

/**
 * 根据价格返回对应的颜色 class（绿=便宜, 黄=中等, 红=贵）
 */
export function priceColorClass(price: number): string {
  if (price < 260) return "text-price-cheap";
  if (price < 290) return "text-price-mid";
  return "text-price-expensive";
}

export function priceColorHex(price: number): string {
  if (price < 260) return "#4ADE80";
  if (price < 290) return "#FBBF24";
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
