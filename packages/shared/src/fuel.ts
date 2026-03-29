export const FUEL_TYPES = ["U91", "U95", "U98", "E10", "Diesel"] as const;
export type FuelType = (typeof FUEL_TYPES)[number];
