"use client";

import { isStale, timeAgo } from "@/lib/utils";

interface StaleBannerProps {
  /** 数据最后更新时间（ISO 串），为空则不渲染 */
  lastUpdated: string | null | undefined;
  className?: string;
}

/**
 * 数据过期（> ~12h）告警横幅。只在确实过期时渲染，避免在正常情况下打扰用户。
 */
export function StaleBanner({ lastUpdated, className }: StaleBannerProps) {
  if (!lastUpdated || !isStale(lastUpdated)) return null;

  return (
    <div
      role="status"
      className={`flex items-center gap-2 rounded-[var(--radius-card)] border border-price-expensive/30 bg-price-expensive/10 px-3 py-2 text-xs text-price-expensive ${className ?? ""}`}
    >
      <svg
        width="14"
        height="14"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        className="shrink-0"
      >
        <path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
        <line x1="12" y1="9" x2="12" y2="13" />
        <line x1="12" y1="17" x2="12.01" y2="17" />
      </svg>
      <span>
        Prices may be out of date — last updated {timeAgo(lastUpdated)}.
      </span>
    </div>
  );
}
