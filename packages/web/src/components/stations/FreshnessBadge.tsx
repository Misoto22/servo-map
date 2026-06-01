"use client";

import { cn, timeAgo } from "@/lib/utils";

interface FreshnessBadgeProps {
  /** 数据最后更新时间（ISO 串） */
  lastUpdated: string;
  /** 紧凑模式：去掉前缀文字，只显示相对时间 */
  compact?: boolean;
  className?: string;
}

type Tier = {
  label: string;
  /** 文字色 token */
  fg: string;
  /** 背景色（半透明 token） */
  bg: string;
  /** 圆点色 */
  dot: string;
};

/**
 * 把更新时间映射到颜色分级的小药丸：
 * - Live   < 1h   绿
 * - Recent < 6h   黄
 * - Aging  < 12h  深黄（仍可用，但提醒变旧）
 * - Stale  >= 12h 红
 */
function tierFor(dateStr: string): Tier {
  const diffHr = (Date.now() - new Date(dateStr).getTime()) / 3_600_000;
  if (diffHr < 1) {
    return {
      label: "Live",
      fg: "text-price-cheap",
      bg: "bg-price-cheap/10",
      dot: "bg-price-cheap",
    };
  }
  if (diffHr < 12) {
    return {
      label: "Recent",
      fg: "text-price-mid",
      bg: "bg-price-mid/10",
      dot: "bg-price-mid",
    };
  }
  return {
    label: "Stale",
    fg: "text-price-expensive",
    bg: "bg-price-expensive/10",
    dot: "bg-price-expensive",
  };
}

/** 颜色分级的相对时间药丸，反映数据新鲜度。 */
export function FreshnessBadge({
  lastUpdated,
  compact = false,
  className,
}: FreshnessBadgeProps) {
  const tier = tierFor(lastUpdated);
  const rel = timeAgo(lastUpdated);

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-[var(--radius-pill)] px-2.5 py-1 text-xs font-semibold",
        tier.fg,
        tier.bg,
        className,
      )}
      title={`Data updated ${rel}`}
    >
      <span className={cn("w-1.5 h-1.5 rounded-full", tier.dot)} />
      {compact ? rel : `${tier.label} · ${rel}`}
    </span>
  );
}
