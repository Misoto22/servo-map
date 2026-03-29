"use client";

import { useState } from "react";
import Link from "next/link";
import type { StationWithDistance, FuelType } from "@servo-map/shared";
import { FUEL_TYPES } from "@servo-map/shared";
import { PriceTag } from "@/components/stations/PriceTag";
import { PriceRangeProvider } from "@/providers/PriceRangeProvider";
import { cn, getFuelPrice, timeAgo } from "@/lib/utils";

interface Props {
  suburbName: string;
  stateName: string;
  stations: StationWithDistance[];
  cheapestU91: number;
}

export function SuburbPageClient({
  suburbName,
  stateName,
  stations,
  cheapestU91,
}: Props) {
  const [selectedFuel, setSelectedFuel] = useState<FuelType>("U91");

  // 按选中燃油类型排序
  const sorted = [...stations].sort((a, b) => {
    const pa = getFuelPrice(a.prices, selectedFuel)?.price ?? Infinity;
    const pb = getFuelPrice(b.prices, selectedFuel)?.price ?? Infinity;
    return pa - pb;
  });

  return (
    <PriceRangeProvider stations={stations} selectedFuel={selectedFuel}>
    <div className="min-h-screen bg-bg">
      {/* Header */}
      <header className="border-b border-border-subtle">
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center gap-3">
          <Link
            href="/"
            className="flex items-center gap-2 text-text-secondary hover:text-text transition-colors"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <path d="M19 12H5" />
              <path d="M12 19l-7-7 7-7" />
            </svg>
            <span className="text-sm">Map</span>
          </Link>
        </div>
      </header>

      {/* Hero */}
      <section className="border-b border-border-subtle">
        <div className="max-w-4xl mx-auto px-4 py-12 animate-slide-up">
          <p className="text-xs font-semibold uppercase tracking-wider text-ochre mb-2">
            Fuel Prices
          </p>
          <h1 className="font-display font-bold text-4xl md:text-5xl text-text">
            {suburbName}
          </h1>
          <p className="text-text-secondary mt-2 text-lg">
            {stateName} &middot; {stations.length} station
            {stations.length !== 1 ? "s" : ""}
          </p>
          <div className="mt-6 inline-flex items-baseline gap-2 bg-surface-elevated rounded-[var(--radius-card)] px-5 py-3 border border-border-subtle">
            <span className="text-xs text-text-muted uppercase tracking-wider">
              Cheapest U91
            </span>
            <PriceTag cents={cheapestU91} size="xl" />
          </div>
        </div>
      </section>

      <main className="max-w-4xl mx-auto px-4 py-8">
        {/* 燃油类型选择 */}
        <div className="flex gap-1 bg-surface rounded-[var(--radius-pill)] p-1 mb-6 w-fit animate-slide-up delay-1">
          {FUEL_TYPES.map((fuel) => (
            <button
              key={fuel}
              onClick={() => setSelectedFuel(fuel)}
              className={cn(
                "px-3 py-1.5 rounded-[var(--radius-pill)] text-xs font-semibold transition-all",
                selectedFuel === fuel
                  ? "bg-ochre text-bg"
                  : "text-text-secondary hover:text-text",
              )}
            >
              {fuel}
            </button>
          ))}
        </div>

        {/* 价格表 */}
        <div className="rounded-[var(--radius-card)] border border-border-subtle overflow-hidden animate-slide-up delay-2">
          {/* 表头 */}
          <div className="grid grid-cols-[1fr_auto_auto] gap-4 px-4 py-3 bg-surface-elevated text-xs font-semibold uppercase tracking-wider text-text-muted border-b border-border-subtle">
            <span>Station</span>
            <span className="text-right">Price</span>
            <span className="text-right hidden sm:block">Updated</span>
          </div>

          {/* 行 */}
          {sorted.map((station, i) => {
            const fp = getFuelPrice(station.prices, selectedFuel);
            return (
              <a
                key={station.id}
                href={`/station/${station.id}`}
                className={cn(
                  "grid grid-cols-[1fr_auto_auto] gap-4 px-4 py-3.5 items-center hover:bg-surface-hover transition-colors border-b border-border-subtle last:border-b-0",
                  i === 0 && "bg-price-cheap/5",
                )}
              >
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-semibold uppercase tracking-wider text-ochre">
                      {station.brand}
                    </span>
                    {i === 0 && (
                      <span className="text-[10px] font-semibold text-price-cheap bg-price-cheap/10 px-1.5 py-0.5 rounded">
                        CHEAPEST
                      </span>
                    )}
                  </div>
                  <p className="text-sm font-medium text-text truncate">
                    {station.name}
                  </p>
                  <p className="text-xs text-text-muted truncate">
                    {station.address}
                  </p>
                </div>
                <div className="text-right">
                  {fp ? (
                    <PriceTag cents={fp.price} size="md" />
                  ) : (
                    <span className="text-sm text-text-muted">—</span>
                  )}
                </div>
                <div className="text-right hidden sm:block">
                  {fp && (
                    <span className="text-xs text-text-muted">
                      {timeAgo(fp.updated_at)}
                    </span>
                  )}
                </div>
              </a>
            );
          })}
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-border-subtle mt-16">
        <div className="max-w-4xl mx-auto px-4 py-8">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-text-muted">
            <p>
              Prices sourced from state government APIs. Updated every 15
              minutes.
            </p>
            <Link
              href="/"
              className="text-ochre hover:text-ochre-dim transition-colors"
            >
              ServoMap &mdash; Find cheap fuel across Australia
            </Link>
          </div>
        </div>
      </footer>
    </div>
    </PriceRangeProvider>
  );
}
