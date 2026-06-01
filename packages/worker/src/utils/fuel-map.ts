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

// WA FuelWatch RSS Product 编码 → 统一 FuelType（每次请求一个 Product）
// 1=ULP, 2=Premium 95, 5=Premium 98, 4=Diesel, 10=E10。LPG(6) 等不支持。
const WA_FUEL_MAP: Record<number, FuelType> = {
  1: "U91",
  2: "U95",
  5: "U98",
  4: "Diesel",
  10: "E10",
};

/** Map NSW fuel code to shared FuelType, returns null for unsupported types (LPG, AdBlue, etc.) */
export function mapNswFuelType(code: string): FuelType | null {
  return NSW_FUEL_MAP[code] ?? null;
}

/** Map QLD fuel ID to shared FuelType, returns null for unsupported types */
export function mapQldFuelType(id: number): FuelType | null {
  return QLD_FUEL_MAP[id] ?? null;
}

/** Map WA FuelWatch Product code to shared FuelType, returns null for unsupported types (LPG, etc.) */
export function mapWaFuelType(product: number): FuelType | null {
  return WA_FUEL_MAP[product] ?? null;
}

/** WA FuelWatch Product codes we ingest (one RSS request per product) */
export const WA_FUEL_PRODUCTS = Object.keys(WA_FUEL_MAP).map(Number);
