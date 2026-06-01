"use client";

import {
  cn,
  priceColorClass,
  formatPriceCents,
  priceTier,
  TIER_LABELS,
} from "@/lib/utils";
import { usePriceRange } from "@/providers/PriceRangeProvider";

interface PriceTagProps {
  cents: number;
  size?: "sm" | "md" | "lg" | "xl";
  showUnit?: boolean;
  /** 在价格旁渲染可见的档位文字（Cheap/Fair/Pricey），作为颜色之外的信号 */
  showTier?: boolean;
  className?: string;
}

export function PriceTag({
  cents,
  size = "md",
  showUnit = true,
  showTier = false,
  className,
}: PriceTagProps) {
  const range = usePriceRange();
  const tier = priceTier(cents, range);
  const tierLabel = TIER_LABELS[tier];

  const sizeClasses = {
    sm: "text-sm",
    md: "text-lg",
    lg: "text-2xl",
    xl: "text-4xl",
  };

  return (
    <span
      className={cn(
        "font-display font-bold tabular-nums tracking-tight",
        sizeClasses[size],
        priceColorClass(cents, range),
        className,
      )}
    >
      {formatPriceCents(cents)}
      {showUnit && (
        <span className="text-text-muted font-body font-normal text-[0.5em] ml-0.5">
          ¢/L
        </span>
      )}
      {showTier ? (
        // 可见档位标签：颜色之外的文字信号（WCAG 1.4.1），颜色随价格档位 CSS 变量
        <span
          className={cn(
            "ml-1.5 align-middle font-body font-semibold text-[0.55em] uppercase tracking-wide",
            priceColorClass(cents, range),
          )}
        >
          {tierLabel}
        </span>
      ) : (
        // 不显示可见标签时，仍向屏幕阅读器/色觉用户暴露档位，确保价格不仅靠颜色区分
        <span className="sr-only"> — {tierLabel} relative to nearby</span>
      )}
    </span>
  );
}
