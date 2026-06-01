import type { StationWithDistance, AustralianState } from "@servo-map/shared";

/**
 * 程序化 SEO 的共享工具：slug 互转、郊区聚合统计、邻近郊区交叉链接。
 * 郊区页、州 hub 页、sitemap 都从此派生，避免 slug 规则在多处各写一份而漂移。
 */

/** 郊区名 → slug（kebab），例如 "Umina Beach" → "umina-beach" */
export function suburbToSlug(suburb: string): string {
  return suburb.toLowerCase().trim().replace(/\s+/g, "-");
}

/** slug → 可比较的郊区名（仍为小写），例如 "umina-beach" → "umina beach" */
export function slugToSuburb(slug: string): string {
  return slug.replace(/-/g, " ");
}

/** slug / 州码 → Title Case 展示名，例如 "umina-beach" → "Umina Beach" */
export function toTitleCase(s: string): string {
  return s.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

export interface SuburbStats {
  /** 郊区内站点数 */
  stationCount: number;
  /** 该郊区 U91 均价（分/升），无 U91 数据则 null */
  avgU91: number | null;
  /** 该郊区最便宜 U91 站点，无则 null */
  cheapest: { name: string; brand: string; price: number } | null;
  /** 该郊区最贵 U91 站点，无则 null */
  dearest: { name: string; brand: string; price: number } | null;
  /** 出现的不同品牌数 */
  brandCount: number;
  /** 出现的品牌列表（去重，按出现顺序） */
  brands: string[];
}

/** 取某站点指定燃油价格（分/升），无则 undefined */
function fuelPriceOf(s: StationWithDistance, fuel: string): number | undefined {
  return s.prices.find((p) => p.fuel === fuel)?.price;
}

/**
 * 聚合一个郊区的可读统计，用于模板化正文（清除 thin-content）。
 * 以 U91 作为口径基准（最常见的标准无铅汽油）。
 */
export function computeSuburbStats(
  stations: StationWithDistance[],
): SuburbStats {
  const brands = [...new Set(stations.map((s) => s.brand))];

  const withU91 = stations
    .map((s) => ({
      name: s.name,
      brand: s.brand,
      price: fuelPriceOf(s, "U91"),
    }))
    .filter((x): x is { name: string; brand: string; price: number } =>
      x.price != null,
    );

  if (withU91.length === 0) {
    return {
      stationCount: stations.length,
      avgU91: null,
      cheapest: null,
      dearest: null,
      brandCount: brands.length,
      brands,
    };
  }

  const sorted = [...withU91].sort((a, b) => a.price - b.price);
  const avg =
    withU91.reduce((sum, x) => sum + x.price, 0) / withU91.length;

  return {
    stationCount: stations.length,
    avgU91: avg,
    cheapest: sorted[0],
    dearest: sorted[sorted.length - 1],
    brandCount: brands.length,
    brands,
  };
}

/** 一组站点的 U91 均价（分/升），无 U91 数据则 null。用于「郊区 vs 全州」对比。 */
export function avgU91(stations: StationWithDistance[]): number | null {
  const prices = stations
    .flatMap((s) => s.prices)
    .filter((p) => p.fuel === "U91")
    .map((p) => p.price);
  if (prices.length === 0) return null;
  return prices.reduce((a, b) => a + b, 0) / prices.length;
}

/**
 * 从同州站点集中挑出邻近郊区（用于郊区页交叉链接）。
 * 排除当前郊区，按站点数降序取前 limit 个。简单且无需地理半径计算——
 * 站点多的郊区对用户更有用，也更利于内链权重分配。
 */
export function nearbySuburbs(
  allInState: StationWithDistance[],
  currentSlug: string,
  state: AustralianState | string,
  limit = 6,
): { slug: string; name: string; stationCount: number }[] {
  const counts = new Map<string, { name: string; count: number }>();
  for (const s of allInState) {
    if (s.state !== state) continue;
    const slug = suburbToSlug(s.suburb);
    if (!slug || slug === currentSlug) continue;
    const entry = counts.get(slug);
    if (entry) entry.count += 1;
    else counts.set(slug, { name: toTitleCase(slug), count: 1 });
  }
  return [...counts.entries()]
    .sort((a, b) => b[1].count - a[1].count)
    .slice(0, limit)
    .map(([slug, { name, count }]) => ({
      slug,
      name,
      stationCount: count,
    }));
}

/** 去重出所有郊区（slug + 展示名 + 站点数），按站点数降序。用于州 hub 页与 sitemap。 */
export function uniqueSuburbs(
  stations: StationWithDistance[],
): { slug: string; name: string; stationCount: number }[] {
  const counts = new Map<string, { name: string; count: number }>();
  for (const s of stations) {
    const slug = suburbToSlug(s.suburb);
    if (!slug) continue;
    const entry = counts.get(slug);
    if (entry) entry.count += 1;
    else counts.set(slug, { name: toTitleCase(s.suburb), count: 1 });
  }
  return [...counts.entries()]
    .sort((a, b) => b[1].count - a[1].count)
    .map(([slug, { name, count }]) => ({ slug, name, stationCount: count }));
}
