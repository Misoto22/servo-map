"use client";

import type { StationWithDistance, FuelType } from "@servo-map/shared";
import { StationCard } from "./StationCard";
import { getFuelPrice } from "@/lib/utils";

interface StationListProps {
  stations: StationWithDistance[];
  selectedFuel: FuelType;
  sortBy: "price" | "distance";
  activeStationId: string | null;
  onStationClick: (station: StationWithDistance) => void;
  onSortChange: (sort: "price" | "distance") => void;
}

export function StationList({
  stations,
  selectedFuel,
  sortBy,
  activeStationId,
  onStationClick,
  onSortChange,
}: StationListProps) {
  // 排序逻辑
  const sorted = [...stations].sort((a, b) => {
    if (sortBy === "price") {
      const pa = getFuelPrice(a.prices, selectedFuel)?.price ?? Infinity;
      const pb = getFuelPrice(b.prices, selectedFuel)?.price ?? Infinity;
      return pa - pb;
    }
    return (a.distance ?? Infinity) - (b.distance ?? Infinity);
  });

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
              Nearby Stations
            </h2>
            <p className="text-xs text-text-muted mt-0.5">
              {stations.length} station{stations.length !== 1 ? "s" : ""} found
            </p>
          </div>
          {cheapest && (
            <div className="text-right">
              <p className="text-[10px] uppercase tracking-wider text-text-muted mb-0.5">
                Best price
              </p>
              <span className="font-display font-bold text-xl tabular-nums text-price-cheap">
                {cheapest.toFixed(1)}
              </span>
            </div>
          )}
        </div>

        {/* 排序切换 */}
        <div className="flex gap-1 bg-surface rounded-lg p-0.5">
          {(["price", "distance"] as const).map((mode) => (
            <button
              key={mode}
              onClick={() => onSortChange(mode)}
              className={`flex-1 text-xs font-medium py-1.5 rounded-md transition-all duration-[var(--duration-fast)] capitalize ${
                sortBy === mode
                  ? "bg-surface-elevated text-text shadow-sm"
                  : "text-text-muted hover:text-text-secondary"
              }`}
            >
              {mode === "price" ? "Cheapest" : "Nearest"}
            </button>
          ))}
        </div>
      </div>

      {/* Station list */}
      <div className="flex-1 overflow-y-auto px-2 py-2 space-y-1">
        {sorted.map((station, i) => (
          <StationCard
            key={station.id}
            station={station}
            selectedFuel={selectedFuel}
            isActive={activeStationId === station.id}
            onClick={() => onStationClick(station)}
            style={{ animationDelay: `${i * 50}ms` }}
          />
        ))}

        {stations.length === 0 && (
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
              <circle cx="12" cy="12" r="10" />
              <path d="M12 8v4l2 2" />
            </svg>
            <p className="text-sm">No stations found</p>
            <p className="text-xs mt-1">Try searching a different area</p>
          </div>
        )}
      </div>
    </div>
  );
}
