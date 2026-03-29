import type { AustralianState } from "@servo-map/shared";

export const KV_KEYS = {
  stationsByState: (state: AustralianState) => `stations:${state}` as const,
  stationById: (id: string) => `station:${id}` as const,
  brands: "brands" as const,
  metadata: "metadata" as const,
  refData: (state: AustralianState) => `ref:${state}` as const,
};
