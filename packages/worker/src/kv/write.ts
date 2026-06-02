import type { Station, StateMetadata, AustralianState } from "@servo-map/shared";
import { KV_KEYS } from "./keys";
import { readMetadata } from "./read";

/**
 * Write the per-state station chunk (one KV write per state).
 * We intentionally do NOT write per-station keys anymore — GET /stations/:id
 * derives the state from the id and reads it out of this chunk, which cuts
 * ingest KV writes from ~one-per-station to one-per-state (~100x fewer).
 */
export async function writeStations(
  kv: KVNamespace,
  state: AustralianState,
  stations: Station[],
): Promise<void> {
  await kv.put(KV_KEYS.stationsByState(state), JSON.stringify(stations));
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
