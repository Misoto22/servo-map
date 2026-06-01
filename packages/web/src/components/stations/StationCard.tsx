"use client";

import type { StationWithDistance, FuelType } from "@servo-map/shared";
import { PriceTag } from "./PriceTag";
import { FavouriteButton } from "./FavouriteButton";
import { cn, getFuelPrice, formatDistance, timeAgo } from "@/lib/utils";

interface StationCardProps {
  station: StationWithDistance;
  selectedFuel: FuelType;
  isActive?: boolean;
  isFavourite?: boolean;
  onToggleFavourite?: () => void;
  onClick: () => void;
  style?: React.CSSProperties;
}

export function StationCard({
  station,
  selectedFuel,
  isActive,
  isFavourite,
  onToggleFavourite,
  onClick,
  style,
}: StationCardProps) {
  const fuelPrice = getFuelPrice(station.prices, selectedFuel);

  // 用 div + role 而非 button，以便内部嵌入真实的收藏按钮（按钮不可嵌套）
  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onClick}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onClick();
        }
      }}
      style={style}
      className={cn(
        "w-full text-left px-4 py-3 rounded-[var(--radius-card)] transition-all duration-[var(--duration-fast)] group cursor-pointer outline-none focus-visible:ring-2 focus-visible:ring-ochre/50",
        isActive
          ? "bg-surface-elevated border border-ochre/30"
          : "hover:bg-surface-hover border border-transparent",
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          {/* 站名 + 品牌 */}
          <div className="flex items-center gap-2 mb-1">
            <span className="text-[10px] font-semibold uppercase tracking-wider text-ochre bg-ochre/10 px-1.5 py-0.5 rounded">
              {station.brand}
            </span>
            {station.distance !== undefined && (
              <span className="text-[10px] text-text-muted">
                {formatDistance(station.distance)}
              </span>
            )}
          </div>

          <h3 className="text-sm font-medium text-text truncate group-hover:text-text transition-colors">
            {station.name}
          </h3>

          <p className="text-xs text-text-muted mt-0.5 truncate">
            {station.address}
          </p>
        </div>

        {/* 价格 + 收藏 */}
        <div className="shrink-0 flex items-start gap-1">
          <div className="text-right">
            {fuelPrice ? (
              <>
                <PriceTag cents={fuelPrice.price} size="md" />
                <p className="text-[10px] text-text-muted mt-0.5">
                  {timeAgo(fuelPrice.updated_at)}
                </p>
              </>
            ) : (
              <span className="text-sm text-text-muted">N/A</span>
            )}
          </div>
          {onToggleFavourite && (
            <FavouriteButton
              active={!!isFavourite}
              onToggle={onToggleFavourite}
              size="sm"
            />
          )}
        </div>
      </div>
    </div>
  );
}
