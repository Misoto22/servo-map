"use client";

import { useMemo } from "react";
import type { StationWithDistance, FuelType } from "@servo-map/shared";
import { StationCard } from "./StationCard";
import { StationListSkeleton } from "./StationListSkeleton";
import { getFuelPrice } from "@/lib/utils";

interface StationListProps {
  stations: StationWithDistance[];
  selectedFuel: FuelType;
  sortBy: "price" | "distance";
  activeStationId: string | null;
  /** 是否正在加载（展示骨架屏而非空白） */
  loading?: boolean;
  /** 收藏判定与切换（缺省则不渲染星标） */
  isFavourite?: (id: string) => boolean;
  onToggleFavourite?: (id: string) => void;
  /** 仅显示收藏视图开关 */
  showSavedOnly?: boolean;
  savedCount?: number;
  onToggleSavedOnly?: () => void;
  onStationClick: (station: StationWithDistance) => void;
  onSortChange: (sort: "price" | "distance") => void;
}

export function StationList({
  stations,
  selectedFuel,
  sortBy,
  activeStationId,
  loading,
  isFavourite,
  onToggleFavourite,
  showSavedOnly,
  savedCount = 0,
  onToggleSavedOnly,
  onStationClick,
  onSortChange,
}: StationListProps) {
  // 收藏视图：只保留已收藏站点
  const visible = useMemo(() => {
    if (showSavedOnly && isFavourite) {
      return stations.filter((s) => isFavourite(s.id));
    }
    return stations;
  }, [stations, showSavedOnly, isFavourite]);

  // 排序逻辑
  const sorted = useMemo(() => {
    return [...visible].sort((a, b) => {
      if (sortBy === "price") {
        const pa = getFuelPrice(a.prices, selectedFuel)?.price ?? Infinity;
        const pb = getFuelPrice(b.prices, selectedFuel)?.price ?? Infinity;
        return pa - pb;
      }
      return (a.distance ?? Infinity) - (b.distance ?? Infinity);
    });
  }, [visible, sortBy, selectedFuel]);

  const cheapest = sorted[0]
    ? getFuelPrice(sorted[0].prices, selectedFuel)?.price
    : null;

  return (
    <div className="flex flex-col h-full">
      {/* Panel header */}
      <div className="px-4 pt-4 pb-2 border-b border-border-subtle">
        <div className="flex items-center justify-between mb-3">
          <div>
            <h2 className="font-display font-bold text-base text-text">
              {showSavedOnly ? "Saved Stations" : "Nearby Stations"}
            </h2>
            <p className="text-xs text-text-muted mt-0.5">
              Showing {visible.length} station{visible.length !== 1 ? "s" : ""}
            </p>
          </div>
          {cheapest && !showSavedOnly && (
            <div className="text-right">
              <p className="text-[10px] uppercase tracking-wider text-text-muted mb-0.5">
                Best {selectedFuel}
              </p>
              <span className="font-display font-bold text-xl tabular-nums text-price-cheap">
                {cheapest.toFixed(1)}
              </span>
            </div>
          )}
        </div>

        <div className="flex items-center gap-2">
          {/* 排序切换 */}
          <div
            role="group"
            aria-label="Sort stations"
            className="flex gap-1 bg-surface rounded-lg p-0.5 flex-1"
          >
            {(["price", "distance"] as const).map((mode) => (
              <button
                key={mode}
                type="button"
                onClick={() => onSortChange(mode)}
                aria-pressed={sortBy === mode}
                className={`flex-1 text-xs font-medium py-1.5 rounded-md transition-all duration-[var(--duration-fast)] ${
                  sortBy === mode
                    ? "bg-surface-elevated text-text shadow-sm"
                    : "text-text-muted hover:text-text-secondary"
                }`}
              >
                {mode === "price" ? "Cheapest" : "Nearest"}
              </button>
            ))}
          </div>

          {/* 收藏视图开关 */}
          {onToggleSavedOnly && (
            <button
              type="button"
              onClick={onToggleSavedOnly}
              aria-pressed={showSavedOnly}
              className={`shrink-0 flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
                showSavedOnly
                  ? "bg-ochre/15 border-ochre/40 text-ochre"
                  : "bg-surface border-border-subtle text-text-muted hover:text-text"
              }`}
            >
              <svg
                width="13"
                height="13"
                viewBox="0 0 24 24"
                fill={showSavedOnly ? "currentColor" : "none"}
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
              </svg>
              <span className="tabular-nums">{savedCount}</span>
            </button>
          )}
        </div>
      </div>

      {/* Station list */}
      <div className="flex-1 overflow-y-auto">
        {loading && stations.length === 0 ? (
          <StationListSkeleton />
        ) : (
          <div className="px-2 py-2 space-y-1">
            {sorted.map((station, i) => (
              <StationCard
                key={station.id}
                station={station}
                selectedFuel={selectedFuel}
                isActive={activeStationId === station.id}
                isFavourite={isFavourite?.(station.id)}
                onToggleFavourite={
                  onToggleFavourite
                    ? () => onToggleFavourite(station.id)
                    : undefined
                }
                onClick={() => onStationClick(station)}
                style={{ animationDelay: `${i * 50}ms` }}
              />
            ))}

            {sorted.length === 0 && (
              <div className="flex flex-col items-center justify-center py-12 text-text-muted">
                <svg
                  width="40"
                  height="40"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  className="mb-3 opacity-40"
                >
                  {showSavedOnly ? (
                    <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
                  ) : (
                    <>
                      <circle cx="12" cy="12" r="10" />
                      <path d="M12 8v4l2 2" />
                    </>
                  )}
                </svg>
                {showSavedOnly ? (
                  <>
                    <p className="text-sm">No saved stations yet</p>
                    <p className="text-xs mt-1">
                      Tap the star on a station to save it
                    </p>
                  </>
                ) : (
                  <>
                    <p className="text-sm">No stations found</p>
                    <p className="text-xs mt-1">Try searching a different area</p>
                  </>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
