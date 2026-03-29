import type { Station, StateMetadata, AustralianState } from "@servo-map/shared";
import { KV_KEYS } from "./keys";
import { readMetadata } from "./read";

/** Write per-state station chunk + individual station keys */
export async function writeStations(
  kv: KVNamespace,
  state: AustralianState,
  stations: Station[],
): Promise<void> {
  // 写入按州分组的 chunk
  await kv.put(KV_KEYS.stationsByState(state), JSON.stringify(stations));

  // 写入单独的 station keys（用于 GET /stations/:id）
  for (const station of stations) {
    await kv.put(KV_KEYS.stationById(station.id), JSON.stringify(station));
  }
}

/** Write sorted unique brand list */
export async function writeBrands(
  kv: KVNamespace,
  brands: string[],
): Promise<void> {
  await kv.put(KV_KEYS.brands, JSON.stringify(brands));
}

/** Merge new state metadata with existing, preserving states that didn't update */
export async function writeMetadata(
  kv: KVNamespace,
  updates: Partial<Record<AustralianState, StateMetadata>>,
): Promise<void> {
  const existing = await readMetadata(kv);
  const merged = { ...existing, ...updates };
  await kv.put(KV_KEYS.metadata, JSON.stringify(merged));
}

/** Cache reference data with TTL (seconds) */
export async function writeRefData<T>(
  kv: KVNamespace,
  state: AustralianState,
  data: T,
  ttlSeconds: number,
): Promise<void> {
  await kv.put(KV_KEYS.refData(state), JSON.stringify(data), {
    expirationTtl: ttlSeconds,
  });
}
