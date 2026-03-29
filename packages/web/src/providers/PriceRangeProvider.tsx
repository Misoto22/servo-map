"use client";

import { createContext, useContext, useMemo, type ReactNode } from "react";
import type { StationWithDistance, FuelType } from "@servo-map/shared";
import {
  computePriceRange,
  getFuelPrice,
  type PriceRange,
} from "@/lib/utils";

const PriceRangeContext = createContext<PriceRange | undefined>(undefined);

export function usePriceRange() {
  return useContext(PriceRangeContext);
}

interface Props {
  stations: StationWithDistance[];
  selectedFuel: FuelType;
  children: ReactNode;
}

export function PriceRangeProvider({ stations, selectedFuel, children }: Props) {
  const range = useMemo(() => {
    const prices = stations
      .map((s) => getFuelPrice(s.prices, selectedFuel)?.price)
      .filter((p): p is number => p != null);
    return computePriceRange(prices);
  }, [stations, selectedFuel]);

  return (
    <PriceRangeContext.Provider value={range}>
      {children}
    </PriceRangeContext.Provider>
  );
}
