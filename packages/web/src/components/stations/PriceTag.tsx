"use client";

import { cn, priceColorClass, formatPriceCents } from "@/lib/utils";
import { usePriceRange } from "@/providers/PriceRangeProvider";

interface PriceTagProps {
  cents: number;
  size?: "sm" | "md" | "lg" | "xl";
  showUnit?: boolean;
  className?: string;
}

export function PriceTag({
  cents,
  size = "md",
  showUnit = true,
  className,
}: PriceTagProps) {
  const range = usePriceRange();

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
    </span>
  );
}
