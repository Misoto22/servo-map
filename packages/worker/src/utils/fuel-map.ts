import type { FuelType } from "@servo-map/shared";

// NSW FuelCheck API 油种代码 → 统一 FuelType
const NSW_FUEL_MAP: Record<string, FuelType> = {
  E10: "E10",
  U91: "U91",
  P95: "U95",
  P98: "U98",
  DL: "Diesel",
};

// QLD Fuel Prices API FuelId → 统一 FuelType
const QLD_FUEL_MAP: Record<number, FuelType> = {
  2: "U91",
  5: "U95",
  8: "U98",
  12: "E10",
  3: "Diesel",
};

/** Map NSW fuel code to shared FuelType, returns null for unsupported types (LPG, AdBlue, etc.) */
export function mapNswFuelType(code: string): FuelType | null {
  return NSW_FUEL_MAP[code] ?? null;
}

/** Map QLD fuel ID to shared FuelType, returns null for unsupported types */
export function mapQldFuelType(id: number): FuelType | null {
  return QLD_FUEL_MAP[id] ?? null;
}
