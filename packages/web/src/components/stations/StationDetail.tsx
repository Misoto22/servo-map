"use client";

import type { StationWithDistance, FuelType } from "@servo-map/shared";
import { PriceTag } from "./PriceTag";
import { cn, timeAgo, formatDistance } from "@/lib/utils";

interface StationDetailProps {
  station: StationWithDistance;
  selectedFuel: FuelType;
  onClose: () => void;
}

export function StationDetail({
  station,
  selectedFuel,
  onClose,
}: StationDetailProps) {
  const directionsUrl = `https://www.google.com/maps/dir/?api=1&destination=${station.lat},${station.lng}`;

  return (
    <div className="animate-slide-in-right">
      {/* Header */}
      <div className="flex items-start justify-between px-4 pt-4 pb-3 border-b border-border-subtle">
        <div className="flex-1 min-w-0 mr-3">
          <span className="text-[10px] font-semibold uppercase tracking-wider text-ochre bg-ochre/10 px-1.5 py-0.5 rounded inline-block mb-2">
            {station.brand}
          </span>
          <h2 className="font-display font-bold text-lg text-text leading-tight">
            {station.name}
          </h2>
          <p className="text-xs text-text-muted mt-1">
            {station.address}, {station.suburb} {station.state.toUpperCase()}{" "}
            {station.postcode}
          </p>
          {station.distance !== undefined && (
            <p className="text-xs text-text-secondary mt-0.5">
              {formatDistance(station.distance)} away
            </p>
          )}
        </div>
        <button
          onClick={onClose}
          className="shrink-0 w-8 h-8 rounded-lg flex items-center justify-center text-text-muted hover:text-text hover:bg-surface-hover transition-colors"
          aria-label="Close"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <line x1="18" y1="6" x2="6" y2="18" />
            <line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        </button>
      </div>

      {/* 所有燃油价格 */}
      <div className="px-4 py-4">
        <h3 className="text-xs font-semibold uppercase tracking-wider text-text-muted mb-3">
          Fuel Prices
        </h3>
        <div className="space-y-2">
          {station.prices.map((fp) => (
            <div
              key={fp.fuel}
              className={cn(
                "flex items-center justify-between py-2.5 px-3 rounded-[var(--radius-button)] transition-colors",
                fp.fuel === selectedFuel
                  ? "bg-surface-elevated border border-ochre/20"
                  : "bg-surface-elevated/50",
              )}
            >
              <div className="flex items-center gap-2">
                <span
                  className={cn(
                    "text-sm font-semibold",
                    fp.fuel === selectedFuel ? "text-ochre" : "text-text",
                  )}
                >
                  {fp.fuel}
                </span>
                <span className="text-[10px] text-text-muted">
                  {timeAgo(fp.updated_at)}
                </span>
              </div>
              <PriceTag cents={fp.price} size="md" />
            </div>
          ))}
        </div>
      </div>

      {/* 操作按钮 */}
      <div className="px-4 pb-4 space-y-2">
        <a
          href={directionsUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center justify-center gap-2 w-full py-3 rounded-[var(--radius-button)] bg-ochre text-bg font-semibold text-sm hover:bg-ochre-dim transition-colors"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M3 11l19-9-9 19-2-8-8-2z" />
          </svg>
          Get Directions
        </a>
      </div>
    </div>
  );
}
