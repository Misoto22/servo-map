import type { AustralianState, StateMetadata } from "@servo-map/shared";

/**
 * 覆盖范围与新鲜度的单一事实来源（single source of truth）。
 * "Live" 州 = metadata 中 station_count > 0 的州。前端任何需要判断
 * "哪些州有真实数据" 的地方都应从此派生，而不是硬编码 ["nsw", "qld"]。
 */

/** 各州显示名称（覆盖提示文案用） */
export const STATE_LABELS: Record<AustralianState, string> = {
  nsw: "NSW",
  qld: "QLD",
  vic: "VIC",
  wa: "WA",
  sa: "SA",
  tas: "TAS",
  act: "ACT",
  nt: "NT",
};

/** 从 metadata 派生有真实数据（station_count > 0）的州，按 station_count 降序 */
export function liveStates(
  metadata: Record<string, StateMetadata> | null | undefined,
): AustralianState[] {
  if (!metadata) return [];
  return (Object.entries(metadata) as [AustralianState, StateMetadata][])
    .filter(([, m]) => m.station_count > 0)
    .sort((a, b) => b[1].station_count - a[1].station_count)
    .map(([state]) => state);
}

/** 把 live 州列表格式化为人类可读串，例如 "NSW" 或 "NSW and QLD" */
export function formatLiveStates(states: AustralianState[]): string {
  const labels = states.map((s) => STATE_LABELS[s] ?? s.toUpperCase());
  if (labels.length === 0) return "";
  if (labels.length === 1) return labels[0];
  if (labels.length === 2) return `${labels[0]} and ${labels[1]}`;
  return `${labels.slice(0, -1).join(", ")}, and ${labels[labels.length - 1]}`;
}

/**
 * 取一组 metadata 中最新的 last_updated 时间戳（ISO 串），无数据则返回 null。
 * 用于首页/页脚展示真实的数据更新时间。
 */
export function latestUpdatedAt(
  metadata: Record<string, StateMetadata> | null | undefined,
  states?: AustralianState[],
): string | null {
  if (!metadata) return null;
  const entries = Object.entries(metadata) as [AustralianState, StateMetadata][];
  const scoped = states
    ? entries.filter(([s]) => states.includes(s))
    : entries;
  let latest: string | null = null;
  for (const [, m] of scoped) {
    if (!m.last_updated) continue;
    if (latest === null || new Date(m.last_updated) > new Date(latest)) {
      latest = m.last_updated;
    }
  }
  return latest;
}
