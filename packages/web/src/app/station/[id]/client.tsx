"use client";

import { useState } from "react";
import Link from "next/link";
import type { StationWithDistance, FuelType } from "@servo-map/shared";
import { PriceTag } from "@/components/stations/PriceTag";
import { PriceRangeProvider } from "@/providers/PriceRangeProvider";
import { timeAgo } from "@/lib/utils";

interface Props {
  station: StationWithDistance;
}

export function StationPageClient({ station }: Props) {
  const [selectedFuel, setSelectedFuel] = useState<FuelType>("U91");
  const directionsUrl = `https://www.google.com/maps/dir/?api=1&destination=${station.lat},${station.lng}`;

  return (
    <PriceRangeProvider stations={[station]} selectedFuel={selectedFuel}>
    <div className="min-h-screen bg-bg">
      {/* Header */}
      <header className="border-b border-border-subtle">
        <div className="max-w-3xl mx-auto px-4 py-4 flex items-center gap-3">
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

      <main className="max-w-3xl mx-auto px-4 py-8">
        {/* 站点信息 */}
        <div className="animate-slide-up">
          <span className="text-xs font-semibold uppercase tracking-wider text-ochre bg-ochre/10 px-2 py-1 rounded">
            {station.brand}
          </span>
          <h1 className="font-display font-bold text-3xl mt-3 text-text">
            {station.name}
          </h1>
          <p className="text-text-secondary mt-2">
            {station.address}, {station.suburb} {station.state.toUpperCase()}{" "}
            {station.postcode}
          </p>
        </div>

        {/* 价格卡片 */}
        <section className="mt-8 animate-slide-up delay-1">
          <h2 className="text-xs font-semibold uppercase tracking-wider text-text-muted mb-4">
            Current Prices
          </h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {station.prices.map((fp) => (
              <button
                key={fp.fuel}
                onClick={() => setSelectedFuel(fp.fuel as FuelType)}
                className={`p-4 rounded-[var(--radius-card)] border transition-all ${
                  fp.fuel === selectedFuel
                    ? "bg-surface-elevated border-ochre/30"
                    : "bg-surface border-border-subtle hover:border-border"
                }`}
              >
                <span className="text-xs font-semibold text-text-secondary block mb-1">
                  {fp.fuel}
                </span>
                <PriceTag cents={fp.price} size="lg" showUnit />
                <span className="text-[10px] text-text-muted block mt-1">
                  {timeAgo(fp.updated_at)}
                </span>
              </button>
            ))}
          </div>
        </section>

        {/* Directions */}
        <div className="mt-8 animate-slide-up delay-2">
          <a
            href={directionsUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 px-6 py-3 rounded-[var(--radius-button)] bg-ochre text-bg font-semibold text-sm hover:bg-ochre-dim transition-colors"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M3 11l19-9-9 19-2-8-8-2z" />
            </svg>
            Get Directions
          </a>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-border-subtle mt-16">
        <div className="max-w-3xl mx-auto px-4 py-6 text-center text-xs text-text-muted">
          Prices sourced from state government APIs. Updated every 15 minutes.
        </div>
      </footer>
    </div>
  );
}
